// ================================================
// MUVV ROTAS — Rotas de chat
// GET  /chat/:freteId          → mensagens do frete
// POST /chat/:freteId          → enviar mensagem
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'

export async function chatRoutes(app: FastifyInstance) {

  // ---- LISTAR MENSAGENS DO FRETE ----
  app.get('/:freteId', { preHandler: [authenticate] }, async (request, reply) => {
    const { freteId } = request.params as { freteId: string }
    const userId = (request.user as any).sub

    const frete = await prisma.freight.findUnique({ where: { id: freteId } })
    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })

    // Só quem está no frete pode ver o chat
    if (frete.shipperId !== userId && frete.driverId !== userId) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const mensagens = await prisma.chatMessage.findMany({
      where: { freightId: freteId },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return reply.send({ mensagens })
  })


  // ---- ENVIAR MENSAGEM ----
  app.post('/:freteId', { preHandler: [authenticate] }, async (request, reply) => {
    const { freteId } = request.params as { freteId: string }
    const userId = (request.user as any).sub

    const schema = z.object({
      content: z.string().min(1).max(1000)
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Mensagem inválida' })
    }

    const frete = await prisma.freight.findUnique({ where: { id: freteId } })
    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })

    if (frete.shipperId !== userId && frete.driverId !== userId) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    const mensagem = await prisma.chatMessage.create({
      data: {
        freightId: freteId,
        senderId:  userId,
        content:   result.data.content
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true, role: true } }
      }
    })

    return reply.status(201).send({ mensagem })
  })
}
