// ================================================
// MUVV ROTAS — Rotas de fretes
// GET    /fretes              → listar disponíveis
// POST   /fretes              → criar frete (SHIPPER)
// GET    /fretes/:id          → detalhe
// POST   /fretes/:id/aceitar  → aceitar (DRIVER)
// POST   /fretes/:id/recusar  → recusar (DRIVER)
// POST   /fretes/:id/iniciar  → iniciar (DRIVER)
// POST   /fretes/:id/entregar → entregar (DRIVER)
// POST   /fretes/:id/cancelar → cancelar
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { calculateFreightPrice } from '../services/pricing.service'
import { confirmarEntrega, DELIVERY_ERROR_STATUS } from '../services/delivery.service'

export async function freightRoutes(app: FastifyInstance) {

  // ---- LISTAR DISPONÍVEIS ----
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => {
    const { vehicleType } = request.query as { vehicleType?: string }
    const fretes = await prisma.freight.findMany({
      where: { status: 'PENDING', driverId: null, ...(vehicleType ? { vehicleType: vehicleType as any } : {}) },
      include: { shipper: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' }, take: 50
    })
    return reply.send({ fretes })
  })


  // ---- CRIAR FRETE — apenas SHIPPER ----
  app.post('/', { preHandler: [authenticate, authorize('SHIPPER')] }, async (request, reply) => {
    const schema = z.object({
      title:           z.string().min(3),
      description:     z.string().optional(),
      vehicleType:     z.enum(['MOTO','CARGA_LEVE','VAN','CAMINHAO_MEDIO','CAMINHAO_GRANDE']),
      originAddress:   z.string(),
      originLat:       z.number(),
      originLng:       z.number(),
      originReference: z.string().optional(),
      destAddress:     z.string(),
      destLat:         z.number(),
      destLng:         z.number(),
      destReference:   z.string().optional(),
      helperIncluded:  z.boolean().default(false),
      scheduledFor:    z.string().optional(),
      paymentMethod:   z.enum(['PIX','CASH']).default('PIX')
    })
    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos', details: result.error.flatten().fieldErrors })
    }
    const data   = result.data
    const userId = (request.user as any).sub
    const pricing = await calculateFreightPrice({
      vehicleType: data.vehicleType, originLat: data.originLat, originLng: data.originLng,
      destLat: data.destLat, destLng: data.destLng, helperIncluded: data.helperIncluded
    })
    const platformFee    = parseFloat((pricing.totalPrice * 0.10).toFixed(2))
    const driverReceives = parseFloat((pricing.totalPrice - platformFee).toFixed(2))
    const frete = await prisma.freight.create({
      data: {
        shipperId: userId, title: data.title, description: data.description,
        vehicleType: data.vehicleType, originAddress: data.originAddress,
        originLat: data.originLat, originLng: data.originLng, originReference: data.originReference,
        destAddress: data.destAddress, destLat: data.destLat, destLng: data.destLng,
        destReference: data.destReference, distanceKm: pricing.distanceKm,
        basePrice: pricing.basePrice, helperIncluded: data.helperIncluded,
        helperPrice: pricing.helperPrice, totalPrice: pricing.totalPrice,
        platformFee, driverReceives, paymentMethod: data.paymentMethod,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
        payment: { create: { method: data.paymentMethod, amount: pricing.totalPrice } }
      },
      include: { shipper: { select: { id: true, name: true } } }
    })
    return reply.status(201).send({ message: 'Frete criado com sucesso', frete, pricing })
  })


  // ---- DETALHE ----
  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const frete = await prisma.freight.findUnique({
      where: { id },
      include: {
        shipper: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        driver:  { select: { id: true, name: true, phone: true, avatarUrl: true } },
        trackingEvents: { orderBy: { createdAt: 'asc' } },
        payment: true, review: true, extras: true
      }
    })
    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })
    return reply.send({ frete })
  })


  // ---- ACEITAR — apenas DRIVER ----
  app.post('/:id/aceitar', { preHandler: [authenticate, authorize('DRIVER')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as any).sub
    const frete  = await prisma.freight.findUnique({ where: { id } })
    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })
    if (frete.status !== 'PENDING') return reply.status(400).send({ error: 'Frete não disponível' })
    const updated = await prisma.freight.update({
      where: { id }, data: { driverId: userId, status: 'MATCHED', acceptedAt: new Date() }
    })
    return reply.send({ message: 'Frete aceito!', frete: updated })
  })


  // ---- RECUSAR — apenas DRIVER ----
  app.post('/:id/recusar', { preHandler: [authenticate, authorize('DRIVER')] }, async (request, reply) => {
    return reply.send({ message: 'Frete recusado' })
  })


  // ---- INICIAR — apenas DRIVER ----
  app.post('/:id/iniciar', { preHandler: [authenticate, authorize('DRIVER')] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as any).sub
    const frete  = await prisma.freight.findUnique({ where: { id } })
    if (!frete || frete.driverId !== userId) return reply.status(403).send({ error: 'Acesso negado' })
    if (frete.status !== 'MATCHED') return reply.status(400).send({ error: 'Frete em estado inválido' })
    await prisma.freight.update({ where: { id }, data: { status: 'IN_TRANSIT', startedAt: new Date() } })
    return reply.send({ message: 'Entrega iniciada' })
  })


  // ---- CONFIRMAR ENTREGA — apenas DRIVER ----
  // Lógica financeira delegada ao delivery.service.ts
  app.post('/:id/entregar', { preHandler: [authenticate, authorize('DRIVER')] }, async (request, reply) => {
    const { id: freteId } = request.params as { id: string }
    const userId          = (request.user as any).sub

    const result = await confirmarEntrega(prisma, freteId, userId, request.log)

    if (!result.ok) {
      return reply
        .status(DELIVERY_ERROR_STATUS[result.code])
        .send({ error: result.detail ?? result.code, code: result.code })
    }

    return reply.send({
      message:        'Entrega confirmada. Pagamento creditado.',
      driverReceives: result.driverReceives,
      newBalance:     result.newBalance
    })
  })


  // ---- CANCELAR ----
  app.post('/:id/cancelar', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = (request.user as any).sub
    const schema = z.object({ reason: z.string().optional() })
    const result = schema.safeParse(request.body)
    const frete  = await prisma.freight.findUnique({ where: { id } })
    if (!frete) return reply.status(404).send({ error: 'Frete não encontrado' })
    if (frete.shipperId !== userId && frete.driverId !== userId) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }
    if (frete.status === 'DELIVERED') {
      return reply.status(400).send({ error: 'Não é possível cancelar frete entregue' })
    }
    await prisma.freight.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: result.success ? result.data.reason : undefined }
    })
    return reply.send({ message: 'Frete cancelado' })
  })
}
