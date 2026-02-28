// ─── Lógica financeira central do app Muvv ───────────────────────────────────
// ATENÇÃO: Altere os valores abaixo para ajustar as taxas cobradas por categoria.
// Todas as telas que exibem "Taxa Muvv" e "Valor Líquido" usam estas funções.

import type { FreightCategory, FreightCalc } from '@/types'

// ── Taxas da Muvv por categoria ──────────────────────────────────────────────
// 🔧 ALTERE AQUI: Porcentagem retida pela plataforma para cada tipo de carga
export const MUVV_RATES: Record<FreightCategory, number> = {
  light: 0.08,  // Carga Leve  (até 500kg) — 8%
  heavy: 0.12,  // Carga Pesada (acima de 500kg) — 12%
  zpe:   0.15,  // ZPE/Exportação internacional — 15% (inclui seguro Gold e câmbio)
}

// ── Rótulos de exibição por categoria ───────────────────────────────────────
export const CATEGORY_LABELS: Record<FreightCategory, string> = {
  light: 'Carga Leve',
  heavy: 'Carga Pesada',
  zpe:   'ZPE Export',
}

// ── Câmbio EUR/BRL para fretes ZPE ──────────────────────────────────────────
// 🔧 ALTERE AQUI para atualizar a cotação do Euro
export const EUR_BRL_RATE = 5.5

/**
 * Calcula o lucro líquido do motorista após a taxa da plataforma.
 *
 * @param gross    - Valor bruto do frete em R$
 * @param category - Categoria do frete (light | heavy | zpe)
 *
 * Exemplo: calcNet(340, 'zpe') → { gross:340, fee:51, net:289, rate:0.15 }
 */
export function calcNet(gross: number, category: FreightCategory): FreightCalc {
  const rate = MUVV_RATES[category]
  const fee  = gross * rate
  return { gross, fee, net: gross - fee, rate }
}

/** Converte R$ para € usando EUR_BRL_RATE */
export function brlToEur(brl: number): number {
  return brl / EUR_BRL_RATE
}

/** Formata número como moeda pt-BR sem símbolo. Ex: 1234.5 → "1.234,50" */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Formata número como Euro pt-BR. Ex: 52.4 → "52,40" */
export function formatEUR(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
