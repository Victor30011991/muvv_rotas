// ─── utils/calculations.ts — SHIM de retrocompatibilidade ────────────────────
// Re-exporta tudo de services/calculations.ts.
// Mantido para que screens/ (DocsScreen, WalletScreen, etc.) continuem
// funcionando sem alteração de imports.
// 🔧 NOVOS arquivos devem importar diretamente de '@/services/calculations'.

export * from '@/services/calculations'

// Aliases de nomes legados usados em screens/OrderDetailScreen
export { PLAN_TABLE as TARIFF_TABLE } from '@/services/calculations'
export { MUVV_RATES, CATEGORY_LABELS, EUR_BRL_FALLBACK as EUR_BRL_RATE } from '@/services/calculations'

// brlToEur estático (legado) — para conversão sem hook
import { EUR_BRL_FALLBACK } from '@/services/calculations'
export function brlToEur(brl: number): number {
  return brl / EUR_BRL_FALLBACK
}
export function formatEUR(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
