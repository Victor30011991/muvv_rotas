// ─── services/geocoding.ts — Geocoding via Nominatim OSM ─────────────────────
//
// Usa a API pública do Nominatim (OpenStreetMap) para busca de endereços.
// Sem chave de API. Rate limit: 1 req/s (respeitado via debounce no hook).
//
// FALLBACK: Se a API não responder (offline / dev), retorna STATIC_POINTS.
// 🔧 ALTERE STATIC_POINTS para ajustar os pontos fixos disponíveis offline.

import type { GeocodingResult, GeoPoint, LatLng } from '@/types'

// ── Pontos fixos (fallback offline + opções iniciais do select) ───────────────
export const STATIC_POINTS: GeoPoint[] = [
  { name: 'Parnaíba PI',          coords: [-2.9058, -41.7764] },
  { name: 'ZPE Piauí',            coords: [-2.8421, -41.7512] },
  { name: 'Porto · Luís Correia', coords: [-2.8783, -41.6626] },
  { name: 'Camocim CE',           coords: [-2.9016, -40.8423] },
  { name: 'Tutóia MA',            coords: [-2.7619, -42.2742] },
  { name: 'Teresina PI',          coords: [-5.0920, -42.8038] },
  { name: 'Fortaleza CE',         coords: [-3.7172, -38.5433] },
  { name: 'São Luís MA',          coords: [-2.5307, -44.3068] },
]

// ── Haversine — distância geográfica em km ─────────────────────────────────
const R = 6371
const rad = (d: number) => d * (Math.PI / 180)

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return parseFloat((2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(1))
}

// Fator de correção rodoviária (~30% a mais que linha reta)
export const ROAD_FACTOR = 1.30

export function roadKm(a: LatLng, b: LatLng): number {
  return Math.round(haversineKm(a, b) * ROAD_FACTOR)
}

// ── Nominatim search ─────────────────────────────────────────────────────────
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const HEADERS = { 'Accept-Language': 'pt-BR,pt', 'User-Agent': 'MuvvRotasApp/4.0' }

// Bounding box do Nordeste BR para priorizar resultados locais
const VIEWBOX = '-45.0,-6.0,-36.0,-1.0'

/**
 * Busca endereços via Nominatim.
 * Retorna array de resultados ou [] em caso de erro/offline.
 */
export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  if (query.trim().length < 3) return []

  try {
    const params = new URLSearchParams({
      q:           `${query}, Brasil`,
      format:      'json',
      limit:       '5',
      viewbox:     VIEWBOX,
      bounded:     '0',
      addressdetails: '1',
    })

    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: HEADERS,
      signal:  AbortSignal.timeout(5000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data: Array<{
      lat: string; lon: string
      display_name: string
      address: { city?: string; town?: string; state?: string; country?: string }
    }> = await res.json()

    return data.map(item => {
      const city  = item.address.city ?? item.address.town ?? ''
      const state = item.address.state ?? ''
      const short = city ? `${city}${state ? ', ' + state : ''}` : item.display_name.split(',')[0]
      return {
        name:        short,
        displayName: item.display_name,
        coords:      [parseFloat(item.lat), parseFloat(item.lon)] as LatLng,
      }
    })
  } catch {
    // Offline ou erro — filtra pontos estáticos como fallback
    const q = query.toLowerCase()
    return STATIC_POINTS
      .filter(p => p.name.toLowerCase().includes(q))
      .map(p => ({ name: p.name, displayName: p.name, coords: p.coords }))
  }
}

/**
 * Reverse geocoding — converte coordenadas em nome de lugar.
 */
export async function reverseGeocode(coords: LatLng): Promise<string> {
  try {
    const params = new URLSearchParams({ lat: String(coords[0]), lon: String(coords[1]), format: 'json' })
    const res    = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: HEADERS, signal: AbortSignal.timeout(4000),
    })
    const data   = await res.json()
    const addr   = data.address
    return addr.city ?? addr.town ?? addr.village ?? data.display_name.split(',')[0]
  } catch {
    return `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`
  }
}
