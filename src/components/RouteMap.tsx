// ─── RouteMap — Mapa Leaflet com roteamento real OSRM ────────────────────────
// Suporta múltiplos waypoints (A → B → C → ...).
// Rota real via OSRM público (sem API key).
// Geocoding de endereços via Nominatim.

import { useEffect, useRef, useState } from 'react'
import type { RouteWaypoint } from '@/types'

interface RouteMapProps {
  waypoints: RouteWaypoint[]
  /** Altura do mapa em px */
  height?: number
}

interface OsrmRoute {
  distance: number   // metros
  duration: number   // segundos
  geometry: { coordinates: [number, number][] }
}

/** Busca rota real no OSRM público */
async function fetchOsrmRoute(wps: RouteWaypoint[]): Promise<OsrmRoute | null> {
  if (wps.length < 2) return null
  const coords = wps.map(w => `${w.lng},${w.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
  try {
    const res  = await fetch(url)
    const data = await res.json() as { routes?: OsrmRoute[] }
    return data.routes?.[0] ?? null
  } catch {
    return null
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

export function RouteMap({ waypoints, height = 280 }: RouteMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<import('leaflet').Map | null>(null)
  const polyRef    = useRef<import('leaflet').Polyline | null>(null)
  const markersRef = useRef<import('leaflet').Marker[]>([])
  const [routeInfo, setRouteInfo] = useState<{ dist: string; time: string } | null>(null)
  const [loading,   setLoading]   = useState(false)

  // Inicializa o mapa Leaflet (apenas uma vez)
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    // Importação dinâmica do Leaflet para SSR-safe
    import('leaflet').then(L => {
      // Fix ícone padrão Leaflet + Vite
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center:    [-2.9, -41.7],
        zoom:      12,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      leafletRef.current = map
    })

    return () => {
      leafletRef.current?.remove()
      leafletRef.current = null
    }
  }, [])

  // Atualiza marcadores e rota quando waypoints mudam
  useEffect(() => {
    if (!leafletRef.current || waypoints.length === 0) return

    import('leaflet').then(async L => {
      const map = leafletRef.current!

      // Remove marcadores antigos
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      polyRef.current?.remove()
      polyRef.current = null

      // Cores por posição no percurso
      const colors = ['#1CC8C8', '#57A6C1', '#DAA520', '#3D6B7D', '#1A2B35']

      waypoints.forEach((wp, i) => {
        const color = colors[i % colors.length]
        const icon  = L.divIcon({
          className: '',
          html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            background:${color};border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
          "><span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:700;">${i + 1}</span></div>`,
          iconSize:   [32, 32],
          iconAnchor: [16, 32],
        })

        const marker = L.marker([wp.lat, wp.lng], { icon })
          .bindTooltip(wp.label, { permanent: false, direction: 'top' })
          .addTo(map)

        markersRef.current.push(marker)
      })

      // Ajusta o mapa para mostrar todos os pontos
      if (waypoints.length >= 1) {
        const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lng]))
        map.fitBounds(bounds, { padding: [40, 40] })
      }

      // Busca rota real se tiver >= 2 pontos
      if (waypoints.length >= 2) {
        setLoading(true)
        const route = await fetchOsrmRoute(waypoints)
        setLoading(false)

        if (route) {
          const latlngs = route.geometry.coordinates.map(
            ([lng, lat]) => [lat, lng] as [number, number]
          )
          polyRef.current = L.polyline(latlngs, {
            color:  '#1CC8C8',
            weight: 5,
            opacity: 0.85,
          }).addTo(map)

          setRouteInfo({
            dist: formatDistance(route.distance),
            time: formatDuration(route.duration),
          })
        }
      } else {
        setRouteInfo(null)
      }
    })
  }, [waypoints])

  return (
    <div className="relative w-full rounded-[18px] overflow-hidden" style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />

      {/* Pill de info da rota */}
      {routeInfo && !loading && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000]
          bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-freight
          flex items-center gap-3 text-sm font-semibold border border-muvv-secondary/15">
          <span className="text-muvv-accent">📍 {routeInfo.dist}</span>
          <span className="w-px h-4 bg-muvv-border" />
          <span className="text-muvv-dark">⏱ {routeInfo.time}</span>
        </div>
      )}

      {loading && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000]
          bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-freight text-sm text-muvv-muted">
          Calculando rota...
        </div>
      )}
    </div>
  )
}