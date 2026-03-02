// ─── Tipos globais do app Muvv ────────────────────────────────────────────────

export type FreightCategory = 'light' | 'heavy' | 'zpe'
export type Screen  = 'home' | 'docs' | 'wallet' | 'order' | 'profile'
export type NavTab  = Exclude<Screen, 'order'>
export type SimPeriod = 'daily' | 'weekly' | 'monthly'

export interface Freight {
  from:     string
  to:       string
  distance: string
  value:    number
  category: FreightCategory
}

export interface FreightCalc {
  gross: number
  fee:   number
  net:   number
  rate:  number
}

export interface Transaction {
  id:     number
  label:  string
  type:   'credit' | 'debit'
  amount: number
  cat:    string
  time:   string
  euro?:  number
}

export interface DocItem {
  id:       string
  label:    string
  subtitle: string
  iconPath: string
  required: boolean
  isGold?:  boolean
}

/** Waypoint para o mapa de rotas */
export interface RouteWaypoint {
  id:      string
  label:   string
  lat:     number
  lng:     number
  address: string
}

/** Endereço completo digitado pelo usuário */
export interface AddressForm {
  estado:   string
  cidade:   string
  endereco: string
  numero:   string
  cep:      string
}

/** Resultado de projeção do simulador */
export interface SimProjection {
  period:    SimPeriod
  deliveries: number
  revenue:   number
  fees:      number
  net:       number
  fuel:      number
  profit:    number
}