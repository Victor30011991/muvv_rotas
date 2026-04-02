// ================================================
// MUVV ROTAS — Serviço de precificação v2
//
// MUDANÇA v2: modelo de preço em FAIXAS de km
//
// Problema do modelo linear:
//   Saveiro → Camocim (200km): R$50 + (4×200) = R$850
//   Mercado real cobra: R$450
//
// Solução — faixas com taxa decrescente:
//   Faixa 1: 0-20km   → taxa integral
//   Faixa 2: 20-100km → taxa × 0.70 (desconto 30%)
//   Faixa 3: 100-300km → taxa × 0.45 (desconto 55%)
//   Faixa 4: 300km+   → taxa × 0.30 (desconto 70%)
//
// Resultado com Saveiro (R$4/km):
//   20km × R$4.00 = R$80
//   80km × R$2.80 = R$224
//   Total base = R$50 + R$80 + R$224 = R$354 ✅ próximo do mercado
// ================================================

import { VehicleType } from '@prisma/client'
import { prisma } from '../lib/prisma'

// Tabela padrão atualizada com dados de campo (Parnaíba-PI)
const DEFAULT_PRICING: Record<VehicleType, {
  baseRate:  number
  ratePerKm: number
  minPrice:  number
  helperRate:number
}> = {
  MOTO:            { baseRate: 15,  ratePerKm: 2.50, minPrice: 25,  helperRate: 0   },
  CARGA_LEVE:      { baseRate: 50,  ratePerKm: 4.00, minPrice: 70,  helperRate: 60  },
  VAN:             { baseRate: 120, ratePerKm: 8.00, minPrice: 150, helperRate: 100 },
  CAMINHAO_MEDIO:  { baseRate: 180, ratePerKm: 10.0, minPrice: 190, helperRate: 120 },
  CAMINHAO_GRANDE: { baseRate: 300, ratePerKm: 14.0, minPrice: 300, helperRate: 150 }
}

// Faixas de km e multiplicadores
// Quanto maior a distância, menor o custo por km
const KM_FAIXAS = [
  { ate: 20,  mult: 1.00 },  // até 20km:    taxa integral
  { ate: 100, mult: 0.70 },  // 20-100km:    70% da taxa
  { ate: 300, mult: 0.45 },  // 100-300km:   45% da taxa
  { ate: Infinity, mult: 0.30 }, // 300km+:  30% da taxa
]

interface CalculateInput {
  vehicleType:    VehicleType
  originLat:      number
  originLng:      number
  destLat:        number
  destLng:        number
  helperIncluded: boolean
}

interface CalculateResult {
  vehicleType:    VehicleType
  distanceKm:     number
  basePrice:      number
  helperPrice:    number
  totalPrice:     number
  breakdown: {
    baseRate:   number
    ratePerKm:  number
    distanceKm: number
    helperRate: number
    faixas:     { label: string; km: number; valor: number }[]
  }
}

// Calcula distância em km (fórmula de Haversine)
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a    =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2))
}

// Calcula custo por km usando faixas progressivas
function calcularCustoKm(
  ratePerKm:  number,
  distanceKm: number
): { total: number; faixas: { label: string; km: number; valor: number }[] } {
  let kmRestante = distanceKm
  let kmAnterior = 0
  let total      = 0
  const faixas:  { label: string; km: number; valor: number }[] = []

  for (const faixa of KM_FAIXAS) {
    if (kmRestante <= 0) break

    const limiteKm    = faixa.ate === Infinity ? kmRestante : faixa.ate - kmAnterior
    const kmNaFaixa   = Math.min(kmRestante, limiteKm)
    const taxaFaixa   = parseFloat((ratePerKm * faixa.mult).toFixed(2))
    const valorFaixa  = parseFloat((kmNaFaixa * taxaFaixa).toFixed(2))

    if (kmNaFaixa > 0) {
      const ate = faixa.ate === Infinity ? '∞' : String(faixa.ate)
      faixas.push({
        label: `${kmAnterior}-${ate}km × R$${taxaFaixa}/km`,
        km:    kmNaFaixa,
        valor: valorFaixa
      })
      total += valorFaixa
    }

    kmRestante -= kmNaFaixa
    kmAnterior  = faixa.ate === Infinity ? kmAnterior : faixa.ate
  }

  return { total: parseFloat(total.toFixed(2)), faixas }
}

export async function calculateFreightPrice(
  input: CalculateInput
): Promise<CalculateResult> {
  const { vehicleType, originLat, originLng, destLat, destLng, helperIncluded } = input

  // Busca tabela do banco (permite atualização sem deploy)
  const dbPricing = await prisma.vehiclePricing.findUnique({
    where: { vehicleType }
  })

  const pricing   = dbPricing
    ? {
        baseRate:   Number(dbPricing.baseRate),
        ratePerKm:  Number(dbPricing.ratePerKm),
        minPrice:   Number(dbPricing.minPrice),
        helperRate: Number(dbPricing.helperRate)
      }
    : DEFAULT_PRICING[vehicleType]

  const distanceKm = haversineDistance(originLat, originLng, destLat, destLng)

  // Custo km com faixas
  const { total: custoKm, faixas } = calcularCustoKm(pricing.ratePerKm, distanceKm)

  // Preço base = taxa base + custo km em faixas
  const calculatedPrice = parseFloat((pricing.baseRate + custoKm).toFixed(2))
  const basePrice       = parseFloat(Math.max(calculatedPrice, pricing.minPrice).toFixed(2))

  const helperPrice = helperIncluded ? Number(pricing.helperRate) : 0
  const totalPrice  = parseFloat((basePrice + helperPrice).toFixed(2))

  return {
    vehicleType,
    distanceKm,
    basePrice,
    helperPrice,
    totalPrice,
    breakdown: {
      baseRate:   pricing.baseRate,
      ratePerKm:  pricing.ratePerKm,
      distanceKm,
      helperRate: helperIncluded ? Number(pricing.helperRate) : 0,
      faixas
    }
  }
}
