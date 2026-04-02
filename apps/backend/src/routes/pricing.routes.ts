// ================================================
// MUVV ROTAS — Rotas de precificação
// GET  /precos              → tabela do banco
// POST /precos/calcular     → calcula frete em tempo real
// PUT  /precos/:tipo        → atualiza preço (ADMIN)
// PUT  /precos/comissao     → atualiza comissão global (ADMIN)
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { VehicleType } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middlewares/authenticate'
import { authorize } from '../middlewares/authorize'
import { calculateFreightPrice } from '../services/pricing.service'

const VEHICLE_NAMES: Record<string, { nome: string; emoji: string }> = {
  MOTO:            { nome: 'Moto',           emoji: '🏍️' },
  CARGA_LEVE:      { nome: 'Carga Leve',      emoji: '🚗' },
  VAN:             { nome: 'Van / Furgão',    emoji: '🚐' },
  CAMINHAO_MEDIO:  { nome: 'Caminhão Médio',  emoji: '🚛' },
  CAMINHAO_GRANDE: { nome: 'Caminhão Grande', emoji: '🚚' },
}

const COMISSAO_KEY = 'comissao_percentual'

export async function pricingRoutes(app: FastifyInstance) {

  // ---- TABELA DE PREÇOS (do banco) ----
  app.get('/', async (_, reply) => {
    const rows = await prisma.vehiclePricing.findMany({
      where:   { isActive: true },
      orderBy: { vehicleType: 'asc' }
    })

    const tabela = rows.map(r => ({
      tipo:      r.vehicleType,
      nome:      VEHICLE_NAMES[r.vehicleType]?.nome  ?? r.vehicleType,
      emoji:     VEHICLE_NAMES[r.vehicleType]?.emoji ?? '🚛',
      baseRate:  Number(r.baseRate),
      ratePerKm: Number(r.ratePerKm),
      minPrice:  Number(r.minPrice),
      helperRate:Number(r.helperRate),
    }))

    return reply.send({ tabela, comissao: '13%' })
  })


  // ---- CALCULAR FRETE ----
  app.post('/calcular', async (request, reply) => {
    const schema = z.object({
      vehicleType:    z.enum(['MOTO','CARGA_LEVE','VAN','CAMINHAO_MEDIO','CAMINHAO_GRANDE']),
      originLat:      z.number(),
      originLng:      z.number(),
      destLat:        z.number(),
      destLng:        z.number(),
      helperIncluded: z.boolean().default(false)
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos', details: result.error.flatten() })
    }

    const pricing = await calculateFreightPrice({
      ...result.data,
      vehicleType: result.data.vehicleType as VehicleType
    })

    const COMISSAO      = 0.13
    const platformFee   = parseFloat((pricing.totalPrice * COMISSAO).toFixed(2))
    const driverReceives= parseFloat((pricing.totalPrice - platformFee).toFixed(2))

    return reply.send({ ...pricing, platformFee, driverReceives })
  })


  // ---- ATUALIZAR PREÇO DE UM TIPO (ADMIN) ----
  app.put('/:tipo', { preHandler: [authenticate, authorize('ADMIN')] }, async (request, reply) => {
    const { tipo } = request.params as { tipo: string }

    const VALID = ['MOTO','CARGA_LEVE','VAN','CAMINHAO_MEDIO','CAMINHAO_GRANDE']
    if (!VALID.includes(tipo)) {
      return reply.status(400).send({ error: 'Tipo de veículo inválido' })
    }

    const schema = z.object({
      baseRate:   z.number().min(0),
      ratePerKm:  z.number().min(0),
      minPrice:   z.number().min(0),
      helperRate: z.number().min(0)
    })

    const result = schema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos', details: result.error.flatten() })
    }

    const updated = await prisma.vehiclePricing.upsert({
      where:  { vehicleType: tipo as VehicleType },
      update: { ...result.data, updatedAt: new Date() },
      create: { vehicleType: tipo as VehicleType, ...result.data }
    })

    request.log.info({
      event:  'PRICING_UPDATED',
      tipo,
      userId: (request.user as any).sub,
      dados:  result.data
    })

    return reply.send({
      message: 'Preço atualizado com sucesso.',
      pricing: {
        tipo,
        baseRate:   Number(updated.baseRate),
        ratePerKm:  Number(updated.ratePerKm),
        minPrice:   Number(updated.minPrice),
        helperRate: Number(updated.helperRate),
      }
    })
  })
}
