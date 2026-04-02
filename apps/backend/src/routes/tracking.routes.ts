// ================================================
// MUVV ROTAS — Rotas de rastreamento por etapa
// POST /rastreamento/:freteId/check  → motorista dá check na etapa
// POST /rastreamento/:freteId/foto   → foto da entrega
// GET  /rastreamento/:freteId        → histórico de etapas
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'

// Etapas obrigatórias do frete — em ordem
export const ETAPAS = [
  { status: 'a_caminho',   label: 'A caminho da coleta',   emoji: '🚗' },
  { status: 'coletando',   label: 'Coletando a carga',     emoji: '📦' },
  { status: 'em_rota',     label: 'Em rota de entrega',    emoji: '🛣️' },
  { status: 'chegando',    label: 'Chegando ao destino',   emoji: '📍' },
  { status: 'entregando',  label: 'Realizando a entrega',  emoji: '🤝' }
]

export async function trackingRoutes(app: FastifyInstance) {

  // ---- CHECK NA ETAPA ----
  app.post('/:freteId/check', { preHandler: [authenticate] }, async (request, reply) => {
    const { freteId } = request.params as { freteId: string }
    const userId = (request.user as any).sub

    const schema = z.object({
      status: z.enum(['a_caminho', 'coletando', 'em_rota', 'chegando', 'entregando']),
      lat:    z.number().optional(),
      lng:    z.number().optional(),
      note:   z.string().max(200).optional()
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos' })
    }

    const frete = await prisma.freight.findUnique({ where: { id: freteId } })
    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })
    if (frete.driverId !== userId) {
      return reply.status(403).send({ error: 'Apenas o motorista pode atualizar o status' })
    }

    const etapa = ETAPAS.find(e => e.status === result.data.status)

    // Registra evento de rastreamento
    const evento = await prisma.trackingEvent.create({
      data: {
        freightId: freteId,
        lat:       result.data.lat ?? 0,
        lng:       result.data.lng ?? 0,
        status:    result.data.status,
        note:      result.data.note ?? etapa?.label
      }
    })

    return reply.status(201).send({
      message: `${etapa?.emoji} ${etapa?.label}`,
      evento
    })
  })


  // ---- FOTO DA ENTREGA ----
  app.post('/:freteId/foto', { preHandler: [authenticate] }, async (request, reply) => {
    const { freteId } = request.params as { freteId: string }
    const userId = (request.user as any).sub

    const schema = z.object({
      fotoBase64: z.string().min(1),  // Imagem em base64
      note:       z.string().max(200).optional()
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Foto inválida' })
    }

    const frete = await prisma.freight.findUnique({ where: { id: freteId } })
    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })
    if (frete.driverId !== userId) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    // Salva referência da foto (em produção, fazer upload para S3/Cloudflare)
    const evento = await prisma.trackingEvent.create({
      data: {
        freightId: freteId,
        lat:       0,
        lng:       0,
        status:    'foto_entrega',
        note:      result.data.note ?? 'Foto da entrega registrada'
      }
    })

    // Marca frete com foto de entrega
    await prisma.freight.update({
      where: { id: freteId },
      data:  { deliveryPhotoUrl: `data:image/jpeg;base64,${result.data.fotoBase64.substring(0, 50)}...` }
    })

    return reply.status(201).send({
      message: '📸 Foto da entrega registrada com sucesso',
      evento
    })
  })


  // ---- HISTÓRICO DE ETAPAS ----
  app.get('/:freteId', { preHandler: [authenticate] }, async (request, reply) => {
    const { freteId } = request.params as { freteId: string }

    const eventos = await prisma.trackingEvent.findMany({
      where:   { freightId: freteId },
      orderBy: { createdAt: 'asc' }
    })

    // Mapeia para labels amigáveis
    const timeline = eventos.map(e => {
      const etapa = ETAPAS.find(et => et.status === e.status)
      return {
        ...e,
        label: etapa?.label ?? e.status,
        emoji: etapa?.emoji ?? '📍'
      }
    })

    return reply.send({ timeline })
  })
}
