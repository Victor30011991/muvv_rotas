// ================================================
// MUVV ROTAS — Tipos compartilhados
// Usados por backend, web e mobile
// ================================================

// ---- Enums ----
export type UserRole     = 'DRIVER' | 'SHIPPER' | 'ADMIN'
export type UserStatus   = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'
export type VehicleType  = 'MOTO' | 'CARGA_LEVE' | 'VAN' | 'CAMINHAO_MEDIO' | 'CAMINHAO_GRANDE'
export type FreightStatus = 'PENDING' | 'MATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'DISPUTED'
export type PaymentMethod = 'PIX' | 'CASH'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

// ---- Veículos ----
export const VEHICLE_NAMES: Record<VehicleType, string> = {
  MOTO:            '🏍️  Moto',
  CARGA_LEVE:      '🚗  Carga Leve (Fiorino, Pickup, Kombi)',
  VAN:             '🚐  Van / Furgão',
  CAMINHAO_MEDIO:  '🚛  Caminhão Médio',
  CAMINHAO_GRANDE: '🚚  Caminhão Grande'
}

// ---- Tabela de preços base (Parnaíba-PI) ----
export const BASE_PRICING: Record<VehicleType, {
  baseRate:   number
  ratePerKm:  number
  minPrice:   number
  helperRate: number
}> = {
  MOTO:            { baseRate: 15,  ratePerKm: 2.50, minPrice: 25,  helperRate: 0   },
  CARGA_LEVE:      { baseRate: 50,  ratePerKm: 4.00, minPrice: 50,  helperRate: 60  },
  VAN:             { baseRate: 120, ratePerKm: 8.00, minPrice: 150, helperRate: 100 },
  CAMINHAO_MEDIO:  { baseRate: 150, ratePerKm: 10.0, minPrice: 150, helperRate: 120 },
  CAMINHAO_GRANDE: { baseRate: 300, ratePerKm: 14.0, minPrice: 300, helperRate: 150 }
}

// ---- Comissão da plataforma ----
export const PLATFORM_FEE_PERCENT = 0.10 // 10%

// ---- Status labels ----
export const FREIGHT_STATUS_LABELS: Record<FreightStatus, string> = {
  PENDING:    'Aguardando motorista',
  MATCHED:    'Motorista a caminho',
  IN_TRANSIT: 'Em rota',
  DELIVERED:  'Entregue',
  CANCELLED:  'Cancelado',
  DISPUTED:   'Em disputa'
}

// ---- Helpers ----
export function formatMoney(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

export function calcDriverReceives(totalPrice: number): number {
  return parseFloat((totalPrice * (1 - PLATFORM_FEE_PERCENT)).toFixed(2))
}

export function calcPlatformFee(totalPrice: number): number {
  return parseFloat((totalPrice * PLATFORM_FEE_PERCENT).toFixed(2))
}
