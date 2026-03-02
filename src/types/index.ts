// ─── Types — Muvv Rotas v4 ────────────────────────────────────────────────────

// ── Perfis da plataforma ──────────────────────────────────────────────────────
export type AppProfile = 'hub' | 'driver' | 'client' | 'dispatcher'

// ── Planos Muvv ───────────────────────────────────────────────────────────────
export type MuvvPlan = 'go' | 'pro' | 'global'

// ── Categorias de frete ───────────────────────────────────────────────────────
export type FreightCategory = 'light' | 'heavy' | 'zpe'

// ── Sub-telas do painel do motorista ─────────────────────────────────────────
export type DriverScreen = 'home' | 'docs' | 'wallet' | 'order' | 'profile'
export type DriverNavTab  = Exclude<DriverScreen, 'order'>
/** Alias de retrocompatibilidade → use DriverNavTab em novos arquivos */
export type NavTab = DriverNavTab
export type Screen = DriverScreen

// ── Coordenada [lat, lng] ─────────────────────────────────────────────────────
export type LatLng = [number, number]

// ── Ponto geográfico ──────────────────────────────────────────────────────────
export interface GeoPoint {
  name: string
  coords: LatLng
  /** true quando veio de busca livre (Nominatim), false quando é ponto fixo */
  fromSearch?: boolean
}

// ── Frete ─────────────────────────────────────────────────────────────────────
export interface Freight {
  from: string
  to: string
  distance: string
  distanceKm: number
  value: number
  category: FreightCategory
  plan?: MuvvPlan
}

// ── Resultado de cálculo ──────────────────────────────────────────────────────
export interface FreightCalc {
  gross: number
  fee: number
  net: number
  rate: number
  planLabel: string
}

// ── Resultado do geocoding ────────────────────────────────────────────────────
export interface GeocodingResult {
  name: string
  displayName: string
  coords: LatLng
}

// ── BI — Perfil de operação ───────────────────────────────────────────────────
export type OperationProfile = 'fulltime' | 'freelancer'

// ── Checklist do despachante ──────────────────────────────────────────────────
export interface DispatcherChecklist {
  insurance: boolean
  monitoring: boolean
  satelliteLock: boolean
  documentation: boolean
  loadSeal: boolean
}

// ── Transação da carteira ─────────────────────────────────────────────────────
export interface Transaction {
  id: number
  label: string
  type: 'credit' | 'debit'
  amount: number
  cat: string
  time: string
  euro?: number
}

// ── Item de documento ─────────────────────────────────────────────────────────
export interface DocItem {
  id: string
  label: string
  subtitle: string
  iconPath: string
  required: boolean
  isGold?: boolean
}
