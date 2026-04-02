// ================================================
// MUVV ROTAS — Rotas de avaliação
// POST /avaliacoes/:freteId  → avaliar após entrega
// GET  /avaliacoes/motorista/:id → avaliações do motorista
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'

export async function reviewRoutes(app: FastifyInstance) {

  // ---- AVALIAR FRETE ----
  app.post('/:freteId', { preHandler: [authenticate] }, async (request, reply) => {
    const { freteId } = request.params as { freteId: string }
    const userId = (request.user as any).sub

    const schema = z.object({
      rating:  z.number().int().min(1).max(5),
      comment: z.string().max(500).optional()
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos' })
    }

    const frete = await prisma.freight.findUnique({ where: { id: freteId } })

    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })
    if (frete.status !== 'DELIVERED') {
      return reply.status(400).send({ error: 'Só é possível avaliar fretes entregues' })
    }

    // Determina quem avalia quem
    const isShipper = frete.shipperId === userId
    const isDriver  = frete.driverId  === userId

    if (!isShipper && !isDriver) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const reviewedId = isShipper ? frete.driverId! : frete.shipperId

    // Verifica se já avaliou
    const existing = await prisma.review.findFirst({
      where: { freightId: freteId, reviewerId: userId }
    })

    if (existing) {
      return reply.status(409).send({ error: 'Você já avaliou este frete' })
    }

    const review = await prisma.review.create({
      data: {
        freightId:  freteId,
        reviewerId: userId,
        reviewedId,
        rating:     result.data.rating,
        comment:    result.data.comment
      }
    })

    // Atualiza rating médio do motorista avaliado
    if (isShipper) {
      const avg = await prisma.review.aggregate({
        where:  { reviewedId },
        _avg:   { rating: true },
        _count: { rating: true }
      })

      await prisma.driverProfile.update({
        where: { userId: reviewedId },
        data:  { rating: parseFloat((avg._avg.rating ?? 0).toFixed(1)) }
      })
    }

    return reply.status(201).send({ message: 'Avaliação enviada', review })
  })


  // ---- AVALIAÇÕES DE UM MOTORISTA ----
  app.get('/motorista/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const reviews = await prisma.review.findMany({
      where:   { reviewedId: id },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' },
      take:    20
    })

    const avg = await prisma.review.aggregate({
      where: { reviewedId: id },
      _avg:  { rating: true },
      _count: true
    })

    return reply.send({
      reviews,
      summary: {
        average: parseFloat((avg._avg.rating ?? 0).toFixed(1)),
        total:   avg._count
      }
    })
  })
}
