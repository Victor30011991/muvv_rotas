// ─── services/calculations.ts — Motor Financeiro Muvv v4 ─────────────────────
//
// PLANOS:
//   Muvv Go     → Carga leve / urbana  · Saída R$50 · R$2,50/km · margem 14.5%
//   Muvv Pro    → Carga média/pesada   · Saída R$150 · R$3,00/km · margem 18%
//   Muvv Global → Logística ZPE/Export · Saída R$150 · R$3,00/km · margem 15%
//
// FÓRMULA:  Bruto = Saída + MAX(0, km - 5) × custo_km
//           Taxa  = Bruto × margem%
//           Líquido = Bruto - Taxa
//
// 🔧 ALTERE: PLAN_TABLE para ajustar saídas, custos e margens.

import type { FreightCategory, FreightCalc, MuvvPlan } from '@/types'

// ── Tabela de planos ─────────────────────────────────────────────────────────
export const PLAN_TABLE: Record<
  MuvvPlan,
  {
    label: string
    shortLabel: string
    emoji: string
    baseValue: number   // R$ saída (cobre freeKm)
    freeKm: number      // km cobertos pela saída
    costPerKm: number   // R$/km acima do freeKm
    rate: number        // margem Muvv (decimal)
    color: string
    categories: FreightCategory[]
  }
> = {
  go: {
    label:      'Muvv Go',
    shortLabel: 'Go',
    emoji:      '🚐',
    baseValue:  50,
    freeKm:     5,
    costPerKm:  2.50,
    rate:       0.145,   // 14,5%
    color:      '#57A6C1',
    categories: ['light'],
  },
  pro: {
    label:      'Muvv Pro',
    shortLabel: 'Pro',
    emoji:      '🚛',
    baseValue:  150,
    freeKm:     5,
    costPerKm:  3.00,
    rate:       0.18,    // 18%
    color:      '#3D6B7D',
    categories: ['heavy'],
  },
  global: {
    label:      'Muvv Global',
    shortLabel: 'Global',
    emoji:      '🌍',
    baseValue:  150,
    freeKm:     5,
    costPerKm:  3.00,
    rate:       0.15,    // 15%
    color:      '#DAA520',
    categories: ['zpe'],
  },
}

// ── Mapeamento categoria → plano padrão ─────────────────────────────────────
export const CATEGORY_TO_PLAN: Record<FreightCategory, MuvvPlan> = {
  light: 'go',
  heavy: 'pro',
  zpe:   'global',
}

// ── Retrocompatibilidade com código legado ────────────────────────────────────
export const MUVV_RATES: Record<FreightCategory, number> = {
  light: PLAN_TABLE.go.rate,
  heavy: PLAN_TABLE.pro.rate,
  zpe:   PLAN_TABLE.global.rate,
}
export const CATEGORY_LABELS: Record<FreightCategory, string> = {
  light: 'Muvv Go · Leve',
  heavy: 'Muvv Pro · Pesado',
  zpe:   'Muvv Global · ZPE',
}

// ── Taxa de câmbio EUR/BRL ─────────────────────────────────────────────────
// 🔧 ALTERE AQUI — ou deixe o hook useCurrencyConvert buscar em tempo real
export const EUR_BRL_FALLBACK = 6.0

/**
 * Calcula o Valor Bruto do frete.
 *   Bruto = baseValue + MAX(0, km - freeKm) × costPerKm
 *
 * @example calcGross(18, 'pro') → 150 + 13×3 = 189
 */
export function calcGross(distanceKm: number, plan: MuvvPlan): number {
  const { baseValue, freeKm, costPerKm } = PLAN_TABLE[plan]
  return baseValue + Math.max(0, distanceKm - freeKm) * costPerKm
}

/** Versão com categoria (resolve plano internamente) */
export function calcGrossFromCategory(distanceKm: number, cat: FreightCategory): number {
  return calcGross(distanceKm, CATEGORY_TO_PLAN[cat])
}

/**
 * Calcula taxa e valor líquido.
 * @returns { gross, fee, net, rate, planLabel }
 */
export function calcNet(gross: number, plan: MuvvPlan): FreightCalc {
  const { rate, label } = PLAN_TABLE[plan]
  const fee = gross * rate
  return { gross, fee, net: gross - fee, rate, planLabel: label }
}

/** calcNet a partir de categoria */
export function calcNetFromCategory(gross: number, cat: FreightCategory): FreightCalc {
  return calcNet(gross, CATEGORY_TO_PLAN[cat])
}

// ── BI / Projeção Anual ───────────────────────────────────────────────────────

export interface BiInput {
  driverCount: number
  profile: 'fulltime' | 'freelancer'  // 22 dias/mês vs 10 dias/mês
  plan: MuvvPlan
  avgDistanceKm: number               // distância média por frete
  freightsPerDay: number              // fretes por dia por motorista
}

export interface BiMonth {
  month: number
  label: string
  grossBrl: number
  netBrl: number
  grossEur: number
  netEur: number
  cumulativeNetBrl: number
}

export interface BiProjection {
  monthlyGross: number
  monthlyNet: number
  annualGross: number
  annualNet: number
  annualGrossEur: number
  annualNetEur: number
  months: BiMonth[]
  revenuePerDriver: number
}

const PT_MONTHS = [
  'Jan','Fev','Mar','Abr','Mai','Jun',
  'Jul','Ago','Set','Out','Nov','Dez',
]

const WORK_DAYS: Record<'fulltime' | 'freelancer', number> = {
  fulltime:   22,
  freelancer: 10,
}

/**
 * Projeta ganhos para 12 meses.
 * Aplica crescimento de +3% mês a mês (network effect).
 */
export function projectBi(input: BiInput, eurRate: number): BiProjection {
  const { driverCount, profile, plan, avgDistanceKm, freightsPerDay } = input
  const workDays    = WORK_DAYS[profile]
  const grossPerFrt = calcGross(avgDistanceKm, plan)
  const calc        = calcNet(grossPerFrt, plan)

  // Frete líquido por motorista por mês
  const monthlyFreights    = workDays * freightsPerDay
  const monthlyGrossSingle = grossPerFrt * monthlyFreights
  const monthlyNetSingle   = calc.net  * monthlyFreights

  // Total da frota
  const monthlyGross = monthlyGrossSingle * driverCount
  const monthlyNet   = monthlyNetSingle   * driverCount

  let cumulative = 0
  const months: BiMonth[] = PT_MONTHS.map((label, i) => {
    const growth     = Math.pow(1.03, i)   // +3%/mês de crescimento orgânico
    const mGross     = monthlyGross * growth
    const mNet       = monthlyNet   * growth
    cumulative      += mNet
    return {
      month: i + 1,
      label,
      grossBrl:          mGross,
      netBrl:            mNet,
      grossEur:          mGross / eurRate,
      netEur:            mNet   / eurRate,
      cumulativeNetBrl:  cumulative,
    }
  })

  const annualGross = months.reduce((s, m) => s + m.grossBrl, 0)
  const annualNet   = months.reduce((s, m) => s + m.netBrl,   0)

  return {
    monthlyGross,
    monthlyNet,
    annualGross,
    annualNet,
    annualGrossEur: annualGross / eurRate,
    annualNetEur:   annualNet   / eurRate,
    months,
    revenuePerDriver: annualNet / driverCount,
  }
}

// ── Formatadores ─────────────────────────────────────────────────────────────
export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function formatEUR(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
export function formatK(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
}
