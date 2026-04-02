// ================================================
// MUVV ROTAS — Rotas da carteira
// GET /carteira          → saldo e resumo
// GET /carteira/extrato  → histórico de transações
// ================================================

import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'

export async function walletRoutes(app: FastifyInstance) {

  // ---- SALDO ----
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request.user as any).sub

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: {
        balance: true,
        totalEarned: true,
        totalWithdrawn: true
      }
    })

    if (!wallet) {
      return reply.status(404).send({ error: 'Carteira não encontrada' })
    }

    // Ganhos da semana
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const weeklyEarnings = await prisma.walletTransaction.aggregate({
      where: {
        wallet: { userId },
        type: 'credit',
        createdAt: { gte: weekAgo }
      },
      _sum: { amount: true }
    })

    return reply.send({
      wallet: {
        ...wallet,
        weeklyEarnings: weeklyEarnings._sum.amount ?? 0
      }
    })
  })


  // ---- EXTRATO ----
  app.get('/extrato', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request.user as any).sub

    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    if (!wallet) {
      return reply.status(404).send({ error: 'Carteira não encontrada' })
    }

    const transacoes = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return reply.send({ transacoes })
  })
}
