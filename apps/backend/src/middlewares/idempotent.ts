// ================================================
// MUVV ROTAS — Middleware de Idempotência
//
// Garante que operações críticas com o header
// Idempotency-Key não sejam executadas duas vezes.
//
// FLUXO:
//   1. Request chega com header Idempotency-Key
//   2. Busca a key no banco
//   3. Se existe → retorna a response salva (sem reprocessar)
//   4. Se não existe → executa normalmente
//   5. Após execução → salva key + response no banco
//
// RESULTADO:
//   - retries de rede nunca duplicam pagamento
//   - resposta é sempre consistente para a mesma key
//   - TTL implícito via índice createdAt (limpeza futura)
//
// USO NA ROTA:
//   app.post('/fretes/:id/entregar', {
//     preHandler: [authenticate, authorize('DRIVER'), idempotent]
//   })
// ================================================

import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'

const IDEMPOTENCY_HEADER = 'idempotency-key'

export async function idempotent(
  request: FastifyRequest,
  reply:   FastifyReply
): Promise<void> {

  const key = request.headers[IDEMPOTENCY_HEADER] as string | undefined

  // Se não enviou header → fluxo normal, sem idempotência
  // Não bloqueia — é opt-in
  if (!key) return

  // Valida formato mínimo da key
  if (key.length < 8 || key.length > 128) {
    reply.status(400).send({
      error: 'Idempotency-Key inválida. Use entre 8 e 128 caracteres.',
      code:  'INVALID_IDEMPOTENCY_KEY'
    })
    return
  }

  try {
    // Busca resposta já salva para esta key
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key }
    })

    if (existing) {
      // Key já existe → retorna resposta salva
      // Não executa a rota novamente
      request.log.info({
        event:         'IDEMPOTENCY_HIT',
        key,
        endpoint:      existing.endpoint,
        originalStatus: existing.statusCode
      })

      reply
        .status(existing.statusCode)
        .header('Idempotency-Replayed', 'true')
        .send(existing.response)
      return
    }

    // Key não existe → injeta contexto para ser salvo após execução
    // A rota executa normalmente; o hook onSend salva a resposta
    ;(request as any).idempotencyKey     = key
    ;(request as any).idempotencyEndpoint = `${request.method} ${request.routerPath}`

  } catch (err) {
    // Erro ao verificar idempotência → deixa passar (fail open)
    // O @@unique no banco ainda protege contra duplicidade
    request.log.warn({
      event: 'IDEMPOTENCY_CHECK_FAILED',
      key,
      error: (err as any)?.message
    })
  }
}

// ------------------------------------------------
// Hook para salvar a resposta após execução
// Deve ser registrado no plugin de rotas:
//   app.addHook('onSend', saveIdempotencyResponse)
// ------------------------------------------------
export async function saveIdempotencyResponse(
  request:  FastifyRequest,
  reply:    FastifyReply,
  payload:  unknown
): Promise<void> {

  const key      = (request as any).idempotencyKey      as string | undefined
  const endpoint = (request as any).idempotencyEndpoint as string | undefined

  if (!key || !endpoint) return

  try {
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload

    await prisma.idempotencyKey.upsert({
      where:  { key },
      update: {}, // Se já existe por race condition: não atualiza
      create: {
        key,
        endpoint,
        statusCode: reply.statusCode,
        response:   body ?? {}
      }
    })
  } catch {
    // Ignora erro ao salvar — o upsert com update vazio
    // garante que race condition não duplica a key
  }
}
