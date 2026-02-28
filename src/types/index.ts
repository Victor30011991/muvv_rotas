// ─── Tipos globais do app Muvv ────────────────────────────────────────────────

/** Categorias de frete — cada uma tem uma taxa Muvv diferente */
export type FreightCategory = 'light' | 'heavy' | 'zpe'

/** Telas disponíveis no app (controla o useState do App.tsx) */
export type Screen = 'home' | 'docs' | 'wallet' | 'order' | 'profile'

/** Abas visíveis no BottomNav */
export type NavTab = Exclude<Screen, 'order'>

/** Dados de um frete disponível */
export interface Freight {
  from: string
  to: string
  distance: string
  /** Valor bruto em R$ antes da taxa Muvv */
  value: number
  category: FreightCategory
}

/** Resultado do cálculo de lucro — ver src/utils/calculations.ts */
export interface FreightCalc {
  gross: number
  fee: number
  net: number
  /** Taxa decimal (ex: 0.15 = 15%) */
  rate: number
}

/** Transação do extrato da carteira */
export interface Transaction {
  id: number
  label: string
  type: 'credit' | 'debit'
  amount: number
  cat: string
  time: string
  /** Equivalente em Euro — apenas para fretes ZPE */
  euro?: number
}

/** Item de documento para onboarding */
export interface DocItem {
  id: string
  label: string
  subtitle: string
  iconPath: string
  required: boolean
  isGold?: boolean
}
