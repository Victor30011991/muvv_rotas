// ─── HomeScreen — Mapa Real + Waypoints + Card de Frete ─────────────────────

import { useState } from 'react'
import { RouteMap }      from '@/components/RouteMap'
import { AddressSearch } from '@/components/AddressSearch'
import { SlideToAccept } from '@/components/SlideToAccept'
import { calcNet, formatBRL } from '@/utils/calculations'
import type { Freight, RouteWaypoint } from '@/types'

interface HomeScreenProps {
  onOrderDetail: (freight: Freight) => void
}

const DEMO_FREIGHT: Freight = {
  from:     'Parnaíba Centro',
  to:       'ZPE Piauí – Terminal A',
  distance: '23 km',
  value:    340,
  category: 'zpe',
}

export function HomeScreen({ onOrderDetail }: HomeScreenProps) {
  const [waypoints,    setWaypoints]    = useState<RouteWaypoint[]>([])
  const [showPlanner,  setShowPlanner]  = useState(false)

  const { net, fee, rate } = calcNet(DEMO_FREIGHT.value, DEMO_FREIGHT.category)

  const addWaypoint = (wp: RouteWaypoint) => {
    setWaypoints(prev => [...prev, wp])
  }

  const removeWaypoint = (id: string) => {
    setWaypoints(prev => prev.filter(w => w.id !== id))
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="bg-gradient-header-blue px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <p className="text-white/70 text-xs font-medium">Boa tarde,</p>
          <h2 className="text-white text-xl font-extrabold leading-tight">Marcos Piauí 🌊</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-muvv-accent text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-accent">
            ● Online
          </span>
          <span className="bg-muvv-prestige text-white text-[11px] font-bold px-2 py-1 rounded-full">
            ZPE
          </span>
        </div>
      </div>

      {/* ── Mapa Real (Leaflet) ───────────────────────────────────── */}
      <div className="mx-4 mt-3 rounded-[18px] overflow-hidden shadow-card">
        <RouteMap waypoints={waypoints} height={220} />
      </div>

      {/* ── Planejador de Rota ────────────────────────────────────── */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setShowPlanner(v => !v)}
          className="w-full flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-card-sm border border-muvv-border cursor-pointer"
        >
          <span className="text-muvv-dark text-sm font-bold">🗺 Planejar Rota ({waypoints.length} pontos)</span>
          <span className="text-muvv-accent text-xs font-semibold">{showPlanner ? 'Fechar ▲' : 'Abrir ▼'}</span>
        </button>

        {showPlanner && (
          <div className="bg-white rounded-2xl mt-2 p-4 shadow-card space-y-3 border border-muvv-border">
            {/* Waypoints existentes */}
            {waypoints.map((wp, i) => (
              <div key={wp.id} className="flex items-center gap-2 bg-muvv-primary rounded-xl p-3">
                <div className="w-6 h-6 rounded-full bg-muvv-accent flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="flex-1 text-muvv-dark text-xs font-medium truncate">{wp.address}</p>
                <button
                  onClick={() => removeWaypoint(wp.id)}
                  className="text-red-400 text-xs font-bold px-2 cursor-pointer border-none bg-transparent"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Adicionar novo ponto */}
            <AddressSearch
              label={waypoints.length === 0 ? 'Ponto de Origem' : `Destino ${waypoints.length}`}
              index={waypoints.length}
              onAdd={addWaypoint}
            />

            {waypoints.length >= 1 && (
              <AddressSearch
                label={`Destino ${waypoints.length + 1} (opcional)`}
                index={waypoints.length + 1}
                onAdd={addWaypoint}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Card de frete disponível ──────────────────────────────── */}
      <div className="mx-4 mt-3 bg-white rounded-[20px] p-5 shadow-freight border border-muvv-secondary/15">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-muvv-secondary" />
            <div className="w-0.5 h-6 rounded-sm" style={{ background: 'linear-gradient(#57A6C1,#1CC8C8)' }} />
            <div className="w-2.5 h-2.5 rounded-full bg-muvv-accent shadow-[0_0_8px_#1CC8C8]" />
          </div>
          <div className="flex-1">
            <p className="text-muvv-muted text-xs">Origem</p>
            <p className="text-muvv-dark text-sm font-semibold mb-1.5">{DEMO_FREIGHT.from}</p>
            <p className="text-muvv-muted text-xs">Destino</p>
            <p className="text-muvv-dark text-sm font-semibold">{DEMO_FREIGHT.to}</p>
          </div>
          <div className="bg-muvv-accent/10 rounded-xl px-3 py-1.5 text-center">
            <p className="text-muvv-accent text-[11px] font-semibold">{DEMO_FREIGHT.distance}</p>
            <p className="text-muvv-muted text-[10px]">ZPE Export</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muvv-primary rounded-xl p-2.5">
            <p className="text-muvv-muted text-[10px]">Bruto</p>
            <p className="text-muvv-dark text-base font-bold">R$ {DEMO_FREIGHT.value}</p>
          </div>
          <div className="bg-muvv-prestige-light rounded-xl p-2.5">
            <p className="text-muvv-prestige text-[10px]">Taxa ({(rate * 100).toFixed(0)}%)</p>
            <p className="text-muvv-prestige text-base font-bold">- R$ {formatBRL(fee)}</p>
          </div>
          <div className="bg-muvv-accent-light rounded-xl p-2.5 border border-muvv-accent/20">
            <p className="text-muvv-accent text-[10px] font-semibold">LÍQUIDO</p>
            <p className="text-muvv-accent text-base font-extrabold">R$ {formatBRL(net)}</p>
          </div>
        </div>

        <SlideToAccept onAccept={() => onOrderDetail(DEMO_FREIGHT)} />
      </div>

      {/* Espaçamento inferior */}
      <div className="h-3" />
    </div>
  )
}