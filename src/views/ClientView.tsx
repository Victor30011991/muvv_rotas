// ─── views/ClientView.tsx — Portal do Cliente ────────────────────────────────
// O cliente informa origem, destino e tipo de carga para obter uma cotação.

import { useState, useMemo, useRef, useCallback } from 'react'
import { MuvvLogo }           from '@/components/MuvvLogo'
import { ZpeMap }             from '@/components/ZpeMap'
import { useFreight }         from '@/context/FreightContext'
import { searchAddress, STATIC_POINTS, roadKm } from '@/services/geocoding'
import { calcGross, calcNet, formatBRL, PLAN_TABLE } from '@/services/calculations'
import type { GeoPoint, GeocodingResult, MuvvPlan } from '@/types'

// ── mini search input reutilizável ────────────────────────────────────────────
function MiniSearch({ label, icon, value, onChange }: {
  label: string; icon: string; value: GeoPoint | null
  onChange: (p: GeoPoint) => void
}) {
  const [q, setQ]         = useState(value?.name ?? '')
  const [res, setRes]     = useState<GeocodingResult[]>([])
  const [open, setOpen]   = useState(false)
  const timer             = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (v: string) => {
    const r = v.length >= 2
      ? await searchAddress(v)
      : STATIC_POINTS.map(p => ({ name: p.name, displayName: p.name, coords: p.coords }))
    setRes(r); setOpen(r.length > 0)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQ(e.target.value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => search(e.target.value), 400)
  }

  return (
    <div className="relative">
      <label className="text-muvv-muted text-[10px] font-semibold uppercase tracking-wide block mb-1">{label}</label>
      <div className="flex items-center gap-2 bg-white border-2 border-muvv-border rounded-xl px-3 py-2.5"
           style={{ borderColor: open ? '#1CC8C8' : '' }}>
        <span>{icon}</span>
        <input value={q} onChange={handleChange}
          onFocus={() => search(q)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Cidade ou endereço…"
          className="flex-1 bg-transparent outline-none text-sm font-semibold text-muvv-dark"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-freight border border-muvv-border z-50 overflow-hidden">
          {res.slice(0,5).map((r,i) => (
            <button key={i} onMouseDown={() => { setQ(r.name); setOpen(false); onChange({ name: r.name, coords: r.coords }) }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muvv-accent-light cursor-pointer border-none bg-transparent border-b border-muvv-border last:border-0 truncate"
              style={{ fontFamily: "'Rubik', sans-serif", color: '#1A2B35' }}>
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const LOAD_TYPES: { id: MuvvPlan; label: string; desc: string; emoji: string }[] = [
  { id: 'go',     label: 'Pequena',   desc: 'Até 300kg · Fiorino',    emoji: '📦' },
  { id: 'pro',    label: 'Média',     desc: 'Até 5t · Caminhão',       emoji: '🚛' },
  { id: 'global', label: 'ZPE/Lote', desc: 'Exportação e logística',  emoji: '🌍' },
]

export function ClientView() {
  const { setProfile, brlToEur, eurRate } = useFreight()
  const [origin,   setOrigin]   = useState<GeoPoint>(STATIC_POINTS[0])
  const [dest,     setDest]     = useState<GeoPoint>(STATIC_POINTS[1])
  const [loadType, setLoadType] = useState<MuvvPlan>('go')
  const [quoted,   setQuoted]   = useState(false)

  const distanceKm = useMemo(() => roadKm(origin.coords, dest.coords), [origin, dest])
  const gross      = useMemo(() => calcGross(distanceKm, loadType), [distanceKm, loadType])
  const { fee, net } = calcNet(gross, loadType)
  const tariff = PLAN_TABLE[loadType]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0"
           style={{ background: 'linear-gradient(135deg, #1CC8C8, #57A6C1)' }}>
        <MuvvLogo variant="full" size={28} light />
        <button onClick={() => setProfile('hub')}
          className="text-white/70 text-xs border border-white/25 rounded-full px-3 py-1 cursor-pointer bg-transparent">
          ← Hub
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Mapa compacto */}
        {!quoted && (
          <div className="h-40 flex-shrink-0">
            <ZpeMap points={[origin, dest]} mapKey={`client-${origin.name}-${dest.name}`} />
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-muvv-dark text-xl font-extrabold">Cotar Frete</h2>
            <p className="text-muvv-muted text-sm">Informe a rota e o tipo de carga</p>
          </div>

          <MiniSearch label="📍 Origem" icon="🟦" value={origin} onChange={setOrigin} />
          <MiniSearch label="🎯 Destino" icon="🔴" value={dest} onChange={setDest} />

          {/* Tipo de carga */}
          <div>
            <p className="text-muvv-muted text-[10px] font-semibold uppercase tracking-wide mb-2">Tipo de Carga</p>
            <div className="grid grid-cols-3 gap-2">
              {LOAD_TYPES.map(lt => {
                const active = loadType === lt.id
                return (
                  <button key={lt.id} onClick={() => setLoadType(lt.id)}
                    className={`rounded-2xl p-3 border-2 cursor-pointer transition-all duration-200 text-center ${
                      active ? 'text-white border-transparent' : 'bg-white border-muvv-border text-muvv-dark'
                    }`}
                    style={active ? { background: PLAN_TABLE[lt.id].color } : {}}>
                    <span className="text-xl block mb-1">{lt.emoji}</span>
                    <p className={`text-xs font-bold ${active ? 'text-white' : 'text-muvv-dark'}`}>{lt.label}</p>
                    <p className={`text-[9px] ${active ? 'text-white/75' : 'text-muvv-muted'}`}>{lt.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Botão cotar */}
          <button
            onClick={() => setQuoted(true)}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base cursor-pointer border-none shadow-accent transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #1CC8C8, #57A6C1)' }}>
            Calcular Frete →
          </button>

          {/* Resultado */}
          {quoted && (
            <div className="bg-white rounded-[20px] overflow-hidden shadow-card border border-muvv-accent/20">
              <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #1CC8C8, #57A6C1)' }}>
                <p className="text-white/80 text-xs mb-1">Cotação Muvv — {tariff.label}</p>
                <p className="text-white text-3xl font-black">R$ {formatBRL(gross)}</p>
                <p className="text-white/70 text-sm mt-0.5">{origin.name} → {dest.name} · {distanceKm} km</p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muvv-muted">Frete base</span>
                  <span className="text-muvv-dark font-semibold">R$ {formatBRL(tariff.baseValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muvv-muted">Distância ({distanceKm} km)</span>
                  <span className="text-muvv-dark font-semibold">
                    R$ {formatBRL(Math.max(0, distanceKm - tariff.freeKm) * tariff.costPerKm)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-muvv-border pt-2">
                  <span className="text-muvv-dark font-bold">Total</span>
                  <span className="text-muvv-dark font-bold">R$ {formatBRL(gross)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muvv-muted">Equivalente em EUR (1€=R${eurRate.toFixed(2)})</span>
                  <span className="text-muvv-prestige font-semibold">€ {formatBRL(brlToEur(gross))}</span>
                </div>

                <button
                  onClick={() => setQuoted(false)}
                  className="w-full mt-2 py-2 rounded-xl text-muvv-accent font-semibold text-sm cursor-pointer border-2 border-muvv-accent/30 bg-muvv-accent-light hover:bg-muvv-accent hover:text-white transition-all">
                  Nova cotação
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
