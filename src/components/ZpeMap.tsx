// ─── ZpeMap — Mapa CartoDB Positron com rota dinâmica ────────────────────────
// Exibe rota entre origem e destino como Polyline azul Muvv.
// Aceita GeoPoint[] para compatibilidade com resultados do geocoding.

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { GeoPoint, LatLng } from '@/types'

const TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'

const ROUTE_COLOR  = '#57A6C1'
const DEST_COLOR   = '#1CC8C8'

function FitBounds({ points }: { points: GeoPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    const lats = points.map(p => p.coords[0])
    const lngs = points.map(p => p.coords[1])
    const sw: LatLng = [Math.min(...lats) - 0.06, Math.min(...lngs) - 0.06]
    const ne: LatLng = [Math.max(...lats) + 0.06, Math.max(...lngs) + 0.06]
    map.fitBounds([sw, ne], { padding: [48, 48], animate: true, duration: 0.7 })
  }, [map, points])
  return null
}

interface ZpeMapProps {
  points: GeoPoint[]
  mapKey?: string
}

export function ZpeMap({ points, mapKey }: ZpeMapProps) {
  const coords = points.map(p => p.coords) as LatLng[]
  const center: LatLng = coords[0] ?? [-2.9058, -41.7764]

  return (
    <MapContainer
      center={center} zoom={9}
      zoomControl={false} attributionControl
      style={{ width: '100%', height: '100%', background: '#f2f4f5' }}
      key={mapKey ?? points.map(p => p.name).join('→')}
    >
      <TileLayer url={TILE} attribution={ATTR} subdomains="abcd" maxZoom={19} />
      <FitBounds points={points} />

      {coords.length >= 2 && (
        <>
          <Polyline positions={coords}
            pathOptions={{ color: '#2A728A', weight: 9, opacity: 0.18, lineCap: 'round', lineJoin: 'round' }} />
          <Polyline positions={coords}
            pathOptions={{ color: ROUTE_COLOR, weight: 4.5, opacity: 0.92, lineCap: 'round', lineJoin: 'round' }} />
        </>
      )}

      {points.map((pt, i) => {
        const isLast = i === points.length - 1
        return (
          <CircleMarker key={`${pt.name}-${i}`} center={pt.coords}
            radius={isLast ? 9 : 7}
            fillColor={isLast ? DEST_COLOR : ROUTE_COLOR}
            color="#FFFFFF" weight={2.5} fillOpacity={1}
          >
            {isLast && (
              <CircleMarker center={pt.coords} radius={18}
                fillColor={DEST_COLOR} color="transparent" weight={0} fillOpacity={0.12} />
            )}
            <Tooltip permanent direction={i === 0 ? 'right' : 'top'}
              offset={i === 0 ? [12, 0] : [0, -12]} className="muvv-map-tooltip">
              {i === 0 ? '📍 ' : '🎯 '}{pt.name}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
