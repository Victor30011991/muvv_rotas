// ================================================
// MUVV ROTAS — Rotas do motorista
// GET  /motoristas/perfil        → meu perfil
// PUT  /motoristas/disponivel    → toggle disponibilidade
// PUT  /motoristas/localizacao   → atualizar posição GPS
// GET  /motoristas/fretes        → meus fretes
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'

export async function driverRoutes(app: FastifyInstance) {

  // ---- MEU PERFIL ----
  app.get('/perfil', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request.user as any).sub

    const driver = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true,
        avatarUrl: true, status: true,
        driverProfile: {
          include: { vehicle: true }
        },
        wallet: {
          select: { balance: true, totalEarned: true }
        }
      }
    })

    if (!driver) {
      return reply.status(404).send({ error: 'Motorista não encontrado' })
    }

    return reply.send({ driver })
  })


  // ---- TOGGLE DISPONIBILIDADE ----
  app.put('/disponivel', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({ isAvailable: z.boolean() })
    const result = schema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos' })
    }

    const userId = (request.user as any).sub

    await prisma.driverProfile.update({
      where: { userId },
      data: { isAvailable: result.data.isAvailable }
    })

    return reply.send({
      message: result.data.isAvailable
        ? 'Você está disponível para receber fretes'
        : 'Você está offline',
      isAvailable: result.data.isAvailable
    })
  })


  // ---- ATUALIZAR LOCALIZAÇÃO ----
  app.put('/localizacao', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      latitude:  z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    })

    const result = schema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({ error: 'Coordenadas inválidas' })
    }

    const userId = (request.user as any).sub

    await prisma.driverProfile.update({
      where: { userId },
      data: {
        lastLatitude:  result.data.latitude,
        lastLongitude: result.data.longitude,
        lastSeenAt:    new Date()
      }
    })

    return reply.send({ message: 'Localização atualizada' })
  })


  // ---- CONFIGURAR CHAVE PIX ----
  app.put('/pix', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      pixKey:     z.string().min(3),
      pixKeyType: z.enum(['cpf', 'telefone', 'email', 'aleatoria'])
    })
    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Chave PIX inválida' })
    }
    const userId = (request.user as any).sub
    await prisma.driverProfile.update({
      where: { userId },
      data: {
        pixKey:     result.data.pixKey,
        pixKeyType: result.data.pixKeyType
      }
    })
    return reply.send({ message: '✅ Chave PIX salva com sucesso' })
  })


  // ---- MEUS FRETES ----
  app.get('/fretes', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = (request.user as any).sub
    const { status } = request.query as { status?: string }

    const fretes = await prisma.freight.findMany({
      where: {
        driverId: userId,
        ...(status ? { status: status as any } : {})
      },
      include: {
        shipper: { select: { id: true, name: true, phone: true } },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return reply.send({ fretes })
  })
}
