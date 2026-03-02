import type { FreightCategory, FreightCalc, SimPeriod, SimProjection } from '@/types'

export const MUVV_RATES: Record<FreightCategory, number> = {
  light: 0.08,
  heavy: 0.12,
  zpe:   0.15,
}

export const CATEGORY_LABELS: Record<FreightCategory, string> = {
  light: 'Carga Leve',
  heavy: 'Carga Pesada',
  zpe:   'ZPE Export',
}

export const EUR_BRL_RATE = 5.5

export function calcNet(gross: number, category: FreightCategory): FreightCalc {
  const rate = MUVV_RATES[category]
  const fee  = gross * rate
  return { gross, fee, net: gross - fee, rate }
}

export function brlToEur(brl: number): number {
  return brl / EUR_BRL_RATE
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatEUR(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Calcula projeção de ganhos e custos por período.
 * @param netPerFreight  - Valor líquido por frete (após taxa Muvv)
 * @param freightsPerDay - Quantas entregas por dia o motorista faz
 * @param fuelCostPerKm  - Custo de combustível por km (padrão R$ 0,45)
 * @param avgKmPerFreight- Km médio por entrega
 * @param period         - 'daily' | 'weekly' | 'monthly'
 */
export function calcSimProjection(
  netPerFreight:   number,
  freightsPerDay:  number,
  fuelCostPerKm:   number,
  avgKmPerFreight: number,
  grossPerFreight: number,
  category:        FreightCategory,
  period:          SimPeriod,
): SimProjection {
  const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30
  const deliveries = freightsPerDay * days
  const revenue    = grossPerFreight * deliveries
  const fees       = revenue * MUVV_RATES[category]
  const net        = revenue - fees
  const fuel       = fuelCostPerKm * avgKmPerFreight * deliveries
  const profit     = net - fuel

  return { period, deliveries, revenue, fees, net, fuel, profit }
}