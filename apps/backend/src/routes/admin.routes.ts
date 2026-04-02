// ================================================
// MUVV ROTAS — Rotas administrativas financeiras
//
// GET  /admin/frete/:id         → visão completa
// POST /admin/reprocessar/:id   → reprocessa com idempotência
// POST /admin/ajustar-saldo     → ajuste manual de saldo
// GET  /admin/stats             → métricas do dashboard
// GET  /admin/motoristas        → lista de motoristas
// GET  /admin/eventos           → log de eventos financeiros
//
// Proteção: authenticate + authorize('ADMIN')
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { confirmarEntrega } from '../services/delivery.service'

export async function adminRoutes(app: FastifyInstance) {

  const adminGuard = { preHandler: [authenticate, authorize('ADMIN')] }

  // ─────────────────────────────────────────────
  // GET /admin/frete/:id
  // Visão completa: frete + payment + wallet + txs
  // ─────────────────────────────────────────────
  app.get('/frete/:id', adminGuard, async (request, reply) => {
    const { id } = request.params as { id: string }

    const frete = await prisma.freight.findUnique({
      where: { id },
      include: {
        shipper:        { select: { id: true, name: true, email: true, phone: true } },
        driver:         { select: { id: true, name: true, email: true, phone: true } },
        payment:        true,
        trackingEvents: { orderBy: { createdAt: 'asc' } },
        review:         true
      }
    })

    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })

    // Transações relacionadas a este frete
    const transacoes = await prisma.walletTransaction.findMany({
      where:   { reference: frete.id },
      include: { wallet: { include: { user: { select: { name: true } } } } }
    })

    // Saldo atual do motorista (se houver)
    let walletDoMotorista = null
    if (frete.driverId) {
      walletDoMotorista = await prisma.wallet.findUnique({
        where: { userId: frete.driverId },
        select: { balance: true, totalEarned: true }
      })
    }

    return reply.send({ frete, transacoes, walletDoMotorista })
  })


  // ─────────────────────────────────────────────
  // POST /admin/reprocessar/:freteId
  // Reexecuta a entrega de forma idempotente.
  // Seguro: se já foi processado retorna 409.
  // Útil quando o motorista entregou mas o app
  // não confirmou por falha de rede.
  // ─────────────────────────────────────────────
  app.post('/reprocessar/:freteId', adminGuard, async (request, reply) => {
    const { freteId } = request.params as { freteId: string }
    const adminId     = (request.user as any).sub

    const frete = await prisma.freight.findUnique({
      where: { id: freteId },
      select: { driverId: true, status: true, title: true }
    })

    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })
    if (!frete.driverId) return reply.status(400).send({ error: 'Frete sem motorista vinculado' })

    request.log.warn({
      event:   'ADMIN_REPROCESS_INITIATED',
      freteId, adminId,
      status:  frete.status
    })

    const result = await confirmarEntrega(
      prisma,
      freteId,
      frete.driverId,
      request.log,
      `admin-reprocess-${freteId}`
    )

    if (!result.ok) {
      return reply.status(result.code === 'ALREADY_PROCESSED' ? 409 : 500).send({
        error: result.detail ?? result.code,
        code:  result.code
      })
    }

    request.log.warn({
      event:         'ADMIN_REPROCESS_COMPLETED',
      freteId,       adminId,
      driverReceives: result.driverReceives.toString(),
      newBalance:    result.newBalance.toString()
    })

    return reply.send({
      message:        'Reprocessamento concluído com sucesso.',
      driverReceives: result.driverReceives,
      newBalance:     result.newBalance
    })
  })


  // ─────────────────────────────────────────────
  // POST /admin/ajustar-saldo
  // Cria WalletTransaction do tipo 'adjustment'.
  // Usado para correções manuais de saldo.
  // Requer justificativa obrigatória.
  // ─────────────────────────────────────────────
  app.post('/ajustar-saldo', adminGuard, async (request, reply) => {
    const schema = z.object({
      userId:      z.string().uuid(),
      amount:      z.number().refine(v => v !== 0, 'Amount não pode ser zero'),
      justificativa: z.string().min(10, 'Justificativa obrigatória (mínimo 10 caracteres)')
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos', details: result.error.flatten() })
    }

    const { userId, amount, justificativa } = result.data
    const adminId = (request.user as any).sub
    const amountDecimal = new Prisma.Decimal(amount.toFixed(2))

    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) return reply.status(404).send({ error: 'Carteira não encontrada' })

    // Incremento atômico via SQL direto
    const [updatedWallet] = await prisma.$queryRaw<{ balance: any }[]>`
      UPDATE wallets
      SET
        balance    = balance + ${amountDecimal}::numeric,
        "updatedAt" = NOW()
      WHERE "userId" = ${userId}
      RETURNING balance
    `

    const newBalance = new Prisma.Decimal(updatedWallet.balance)

    // Cria a transação de ajuste
    // 'adjustment' + userId como reference para não colidir
    // com @@unique([reference, type]) que é para fretes
    await prisma.walletTransaction.create({
      data: {
        walletId:  wallet.id,
        type:      'adjustment',
        amount:    amountDecimal,
        balance:   newBalance,
        reference: `admin-${adminId}-${Date.now()}`,
        note:      `Ajuste administrativo: ${justificativa}`
      }
    })

    // Grava evento de auditoria
    await prisma.financialEvent.create({
      data: {
        type: 'ADMIN_ADJUSTMENT',
        payload: {
          userId, adminId,
          amount:        amountDecimal.toString(),
          newBalance:    newBalance.toString(),
          justificativa
        }
      }
    })

    request.log.warn({
      event:      'ADMIN_BALANCE_ADJUSTED',
      userId,     adminId,
      amount:     amountDecimal.toString(),
      newBalance: newBalance.toString(),
      justificativa
    })

    return reply.send({
      message:    'Saldo ajustado com sucesso.',
      newBalance,
      amount:     amountDecimal
    })
  })


  // ─────────────────────────────────────────────
  // GET /admin/stats
  // Métricas do dashboard
  // ─────────────────────────────────────────────
  app.get('/stats', adminGuard, async (_, reply) => {
    const [
      totalFreights,
      activeFreights,
      pendingFreights,
      deliveredToday,
      totalDrivers,
      onlineDrivers,
      revenueTotal,
      revenueWeek
    ] = await Promise.all([
      prisma.freight.count(),
      prisma.freight.count({ where: { status: { in: ['MATCHED', 'IN_TRANSIT'] } } }),
      prisma.freight.count({ where: { status: 'PENDING' } }),
      prisma.freight.count({
        where: {
          status:      'DELIVERED',
          deliveredAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
        }
      }),
      prisma.user.count({ where: { role: 'DRIVER' } }),
      prisma.driverProfile.count({ where: { isAvailable: true } }),
      prisma.freight.aggregate({
        where:  { status: 'DELIVERED' },
        _sum:   { platformFee: true }
      }),
      prisma.freight.aggregate({
        where: {
          status:      'DELIVERED',
          deliveredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        _sum: { platformFee: true }
      })
    ])

    return reply.send({
      totalFreights,
      activeFreights,
      pendingFreights,
      deliveredToday,
      totalDrivers,
      onlineDrivers,
      totalRevenue:  revenueTotal._sum.platformFee ?? 0,
      weeklyRevenue: revenueWeek._sum.platformFee  ?? 0
    })
  })


  // ─────────────────────────────────────────────
  // GET /admin/motoristas
  // Lista motoristas com dados financeiros
  // ─────────────────────────────────────────────
  app.get('/motoristas', adminGuard, async (_, reply) => {
    const drivers = await prisma.user.findMany({
      where: { role: 'DRIVER' },
      select: {
        id: true, name: true, email: true, phone: true, status: true,
        driverProfile: {
          select: {
            rating: true, totalTrips: true,
            isAvailable: true, loyaltyBadge: true,
            vehicle: { select: { type: true, brand: true, model: true, plate: true } }
          }
        },
        wallet: {
          select: { balance: true, totalEarned: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return reply.send({ drivers })
  })


  // ─────────────────────────────────────────────
  // GET /admin/eventos
  // Log de eventos financeiros para auditoria
  // ─────────────────────────────────────────────
  app.get('/eventos', adminGuard, async (request, reply) => {
    const { type, limit = '50' } = request.query as { type?: string; limit?: string }

    const eventos = await prisma.financialEvent.findMany({
      where:   type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
      take:    Math.min(parseInt(limit), 200)
    })

    return reply.send({ eventos })
  })
}
