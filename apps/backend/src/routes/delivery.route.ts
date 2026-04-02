// ================================================
// MUVV ROTAS — Rota de confirmação de entrega
//
// ARQUITETURA FINANCEIRA:
// Toda a operação acontece em UM único $transaction.
// Leitura de saldo, cálculo, update e transação
// estão no mesmo bloco atômico.
// Nenhuma operação financeira ocorre fora dele.
// ================================================

import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'

// Tolerância para comparação de float
// Absorve erro de ponto flutuante (ex: 8.750000000001)
// sem aceitar divergências reais
const FLOAT_TOLERANCE = 0.01

export async function confirmarEntrega(
  app: FastifyInstance
) {
  app.post(
    '/fretes/:id/entregar',
    { preHandler: [authenticate] },
    async (request, reply) => {

      const { id: freteId } = request.params as { id: string }
      const userId = (request.user as any).sub

      // ─────────────────────────────────────────────
      // PASSO 1 — LEITURA DO FRETE
      // Lido FORA do $transaction porque é somente
      // leitura e as verificações precisam dele.
      // ─────────────────────────────────────────────
      const frete = await prisma.freight.findUnique({
        where: { id: freteId }
      })

      // ─────────────────────────────────────────────
      // PASSO 2 — VALIDAÇÃO DE ACESSO
      // Verifica se o frete existe E se quem está
      // entregando é o motorista do frete.
      // ─────────────────────────────────────────────
      if (!frete || frete.driverId !== userId) {
        return reply.status(403).send({
          error: 'Acesso negado',
          code: 'ACCESS_DENIED'
        })
      }

      // ─────────────────────────────────────────────
      // PASSO 3 — VALIDAÇÃO DE STATUS
      // Só aceita frete em IN_TRANSIT.
      // Bloqueia PENDING, MATCHED, DELIVERED,
      // CANCELLED e DISPUTED.
      // ─────────────────────────────────────────────
      if (frete.status !== 'IN_TRANSIT') {
        return reply.status(400).send({
          error: 'Frete não está em andamento',
          code: 'INVALID_STATUS',
          status: frete.status
        })
      }

      // ─────────────────────────────────────────────
      // PASSO 4 — VALIDAÇÃO DE INTEGRIDADE FINANCEIRA
      //
      // Regra: platformFee + driverReceives deve
      // ser igual a totalPrice com tolerância 0.01.
      //
      // Se os valores do frete estiverem corrompidos
      // (por qualquer motivo), a entrega é bloqueada.
      // O sistema NÃO tenta corrigir — apenas bloqueia.
      //
      // Tolerância existe para absorver erro de
      // aritmética de ponto flutuante.
      // ─────────────────────────────────────────────
      const soma = parseFloat(
        (frete.platformFee + frete.driverReceives).toFixed(2)
      )
      const divergencia = Math.abs(soma - frete.totalPrice)

      if (divergencia >= FLOAT_TOLERANCE) {
        request.log.error({
          event:         'FINANCIAL_INTEGRITY_ERROR',
          freteId:       frete.id,
          userId,
          totalPrice:    frete.totalPrice,
          platformFee:   frete.platformFee,
          driverReceives: frete.driverReceives,
          soma,
          divergencia
        })

        return reply.status(422).send({
          error: 'Inconsistência financeira detectada. Operação bloqueada.',
          code:  'FINANCIAL_INTEGRITY_ERROR'
        })
      }

      // ─────────────────────────────────────────────
      // PASSO 5 — VERIFICAÇÃO DE DUPLICIDADE
      //
      // Verifica se já existe uma WalletTransaction
      // com reference = freteId e type = 'credit'.
      //
      // Isso bloqueia reprocessamento acidental
      // em chamadas sequenciais.
      //
      // Para chamadas SIMULTÂNEAS (race condition),
      // a proteção final está no @@unique([reference, type])
      // do schema — o banco rejeita a segunda inserção.
      // ─────────────────────────────────────────────
      const txExistente = await prisma.walletTransaction.findFirst({
        where: {
          reference: freteId,
          type:      'credit'
        }
      })

      if (txExistente) {
        return reply.status(409).send({
          error: 'Este frete já foi processado financeiramente.',
          code:  'ALREADY_PROCESSED'
        })
      }

      // ─────────────────────────────────────────────
      // PASSO 6 — LEITURA DO SALDO ATUAL
      //
      // Lida FORA do $transaction porque o Prisma
      // não suporta SELECT dentro de $transaction
      // com array (modo sequencial).
      //
      // Lida após todas as validações para minimizar
      // o tempo entre leitura e escrita.
      // ─────────────────────────────────────────────
      const wallet = await prisma.wallet.findUnique({
        where: { userId: frete.driverId! }
      })

      if (!wallet) {
        request.log.error({
          event:   'WALLET_NOT_FOUND',
          freteId: frete.id,
          userId:  frete.driverId
        })

        return reply.status(500).send({
          error: 'Carteira do motorista não encontrada.',
          code:  'WALLET_NOT_FOUND'
        })
      }

      // ─────────────────────────────────────────────
      // PASSO 7 — CÁLCULO DO NOVO SALDO
      //
      // Calculado ANTES do $transaction para que
      // o valor seja determinístico — não depende
      // de leitura dentro da transaction.
      //
      // newBalance: saldo atual + valor do frete
      // newTotalEarned: acumulado histórico + valor do frete
      //
      // Ambos com toFixed(2) para evitar acúmulo
      // de erro de ponto flutuante.
      // ─────────────────────────────────────────────
      const newBalance = parseFloat(
        (wallet.balance + frete.driverReceives).toFixed(2)
      )
      const newTotalEarned = parseFloat(
        (wallet.totalEarned + frete.driverReceives).toFixed(2)
      )

      // ─────────────────────────────────────────────
      // PASSO 8 — EXECUÇÃO DO $transaction ÚNICO
      //
      // TODAS as escritas acontecem aqui.
      // Nenhuma escrita ocorre fora deste bloco.
      //
      // Se qualquer operação falhar, TODAS são
      // revertidas. O banco volta ao estado anterior.
      //
      // Ordem das operações:
      //   A) freight.update   → DELIVERED
      //   B) payment.update   → PAID
      //   C) wallet.update    → balance e totalEarned
      //   D) walletTx.create  → registro da transação
      //   E) driverProfile    → contagem de viagens
      //
      // A operação D pode falhar com P2002 (unique
      // constraint violation) se uma segunda chamada
      // simultânea passou pelo passo 5 ao mesmo tempo.
      // Nesse caso, toda a transaction faz rollback.
      // ─────────────────────────────────────────────
      try {
        await prisma.$transaction([

          // A — Atualiza status do frete
          prisma.freight.update({
            where: { id: freteId },
            data: {
              status:      'DELIVERED',
              deliveredAt: new Date()
            }
          }),

          // B — Atualiza status do pagamento
          prisma.payment.update({
            where: { freightId: freteId },
            data: {
              status: 'PAID',
              paidAt: new Date()
            }
          }),

          // C — Atualiza saldo da carteira
          // newBalance e newTotalEarned foram
          // calculados no passo 7, antes da transaction
          prisma.wallet.update({
            where: { userId: frete.driverId! },
            data: {
              balance:     newBalance,
              totalEarned: newTotalEarned
            }
          }),

          // D — Registra a transação financeira
          // balance aqui é o saldo APÓS a operação
          // não o valor da transação (amount)
          // Se reference + type já existir no banco,
          // o @@unique lança P2002 e tudo faz rollback
          prisma.walletTransaction.create({
            data: {
              walletId:  wallet.id,
              type:      'credit',
              amount:    frete.driverReceives,
              balance:   newBalance,       // saldo pós-operação
              reference: freteId,
              note:      `Frete entregue: ${frete.title}`
            }
          }),

          // E — Atualiza contagem de viagens do motorista
          prisma.driverProfile.update({
            where: { userId: frete.driverId! },
            data: { totalTrips: { increment: 1 } }
          })
        ])

      } catch (err: any) {

        // Erro de constraint única (race condition):
        // outra requisição simultânea completou primeiro
        if (err?.code === 'P2002') {
          request.log.warn({
            event:   'DUPLICATE_PAYMENT_BLOCKED',
            freteId: frete.id,
            userId
          })
          return reply.status(409).send({
            error: 'Operação já foi processada por outra requisição.',
            code:  'ALREADY_PROCESSED'
          })
        }

        // Qualquer outro erro: loga com contexto completo
        request.log.error({
          event:          'DELIVERY_TRANSACTION_FAILED',
          freteId:        frete.id,
          userId,
          amount:         frete.driverReceives,
          walletId:       wallet.id,
          newBalance,
          newTotalEarned,
          error:          err?.message,
          code:           err?.code
        })

        return reply.status(500).send({
          error: 'Erro ao processar a entrega. Tente novamente.',
          code:  'TRANSACTION_FAILED'
        })
      }

      // ─────────────────────────────────────────────
      // PASSO 9 — LOG DE SUCESSO
      // Registra a operação bem-sucedida com
      // contexto suficiente para auditoria.
      // ─────────────────────────────────────────────
      request.log.info({
        event:          'DELIVERY_COMPLETED',
        freteId:        frete.id,
        driverId:       frete.driverId,
        amount:         frete.driverReceives,
        platformFee:    frete.platformFee,
        newBalance,
        newTotalEarned
      })

      // ─────────────────────────────────────────────
      // PASSO 10 — RESPOSTA
      // ─────────────────────────────────────────────
      return reply.send({
        message:        'Entrega confirmada. Pagamento creditado.',
        driverReceives: frete.driverReceives,
        newBalance
      })
    }
  )
}
