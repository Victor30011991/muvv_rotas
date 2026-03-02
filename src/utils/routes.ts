// ─── utils/routes.ts — SHIM de retrocompatibilidade ──────────────────────────
// Re-exporta de services/geocoding.ts.
// 🔧 NOVOS arquivos devem importar diretamente de '@/services/geocoding'.

export { STATIC_POINTS as WAYPOINTS, roadKm as roadDistanceKm, haversineKm } from '@/services/geocoding'
export { ROAD_FACTOR } from '@/services/geocoding'

import { STATIC_POINTS } from '@/services/geocoding'
export const DEFAULT_ORIGIN_IDX      = 0
export const DEFAULT_DESTINATION_IDX = 1
export const DEFAULT_ROUTE           = STATIC_POINTS[0]
