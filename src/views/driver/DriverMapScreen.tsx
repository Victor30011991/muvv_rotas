// ─── views/driver/DriverMapScreen.tsx — Mapa + Simulador ─────────────────────
//
// Fluxo:
//   1. Usuário digita origem/destino numa barra de pesquisa moderna
//      → debounce 400ms → searchAddress() → Nominatim (ou fallback estático)
//   2. Distância = roadKm(origin, dest)
//   3. Usuário escolhe o plano (Go / Pro / Global)
//   4. Card recalcula: Bruto → Taxa → Líquido em tempo real
//   5. SlideToAccept → onAccept(freight)

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ZpeMap }           from '@/components/ZpeMap'
import { SlideToAccept }    from '@/components/SlideToAccept'
import { MuvvLogo }         from '@/components/MuvvLogo'
import { useFreight }       from '@/context/FreightContext'
import { searchAddress, STATIC_POINTS, roadKm } from '@/services/geocoding'
import { calcGross, calcNet, formatBRL, PLAN_TABLE } from '@/services/calculations'
import type { Freight, MuvvPlan, GeoPoint, GeocodingResult } from '@/types'

interface DriverMapScreenProps {
  onAccept: (freight: Freight) => void
}

// ── AddressSearchInput ────────────────────────────────────────────────────────
interface SearchInputProps {
  label: string
  icon: string
  value: GeoPoint | null
  onChange: (point: GeoPoint) => void
  placeholder?: string
}

function AddressSearchInput({ label, icon, value, onChange, placeholder }: SearchInputProps) {
  const [query,      setQuery]      = useState(value?.name ?? '')
  const [results,    setResults]    = useState<GeocodingResult[]>([])
  const [open,       setOpen]       = useState(false)
  const [searching,  setSearching]  = useState(false)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  // Sincroniza o texto quando o value externo muda (ex: ao selecionar no mapa)
  useEffect(() => { setQuery(value?.name ?? '') }, [value])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    setSearching(true)
    const res = await searchAddress(q)
    setResults(res)
    setOpen(res.length > 0)
    setSearching(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 400)
  }

  const handleSelect = (r: GeocodingResult) => {
    setQuery(r.name)
    setOpen(false)
    onChange({ name: r.name, coords: r.coords, fromSearch: true })
    inputRef.current?.blur()
  }

  const handleFocus = () => {
    // Mostra pontos estáticos imediatamente ao focar sem texto
    if (!query) {
      setResults(STATIC_POINTS.map(p => ({ name: p.name, displayName: p.name, coords: p.coords })))
      setOpen(true)
    }
  }

  return (
    <div className="flex-1 min-w-0 relative">
      <p className="text-[9px] font-bold uppercase tracking-wider mb-1 px-1"
         style={{ color: '#8AAEBB' }}>{label}</p>

      {/* Barra de busca */}
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2.5 border-2 transition-all duration-200"
        style={{
          background:  'white',
          borderColor: open ? '#1CC8C8' : '#EBF2F5',
          boxShadow:   open ? '0 0 0 3px rgba(28,200,200,0.12)' : '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <span className="text-sm flex-shrink-0">{icon}</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? 'Buscar cidade ou endereço…'}
          className="flex-1 bg-transparent outline-none text-[13px] font-semibold min-w-0"
          style={{ color: '#1A2B35', fontFamily: "'Rubik', sans-serif" }}
        />
        {searching && (
          <div className="w-3 h-3 rounded-full border-2 border-muvv-accent border-t-transparent animate-spin flex-shrink-0" />
        )}
      </div>

      {/* Dropdown de resultados */}
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden z-50"
          style={{
            background:  'white',
            boxShadow:   '0 8px 32px rgba(26,43,53,0.18)',
            border:      '1.5px solid rgba(87,166,193,0.2)',
          }}
        >
          {results.slice(0, 5).map((r, i) => (
            <button
              key={i}
              onMouseDown={() => handleSelect(r)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muvv-accent-light cursor-pointer border-none bg-transparent transition-colors border-b border-muvv-border last:border-0"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              <p className="text-muvv-dark font-semibold text-[13px] truncate">{r.name}</p>
              {r.displayName !== r.name && (
                <p className="text-muvv-muted text-[10px] truncate">{r.displayName.split(',').slice(0,3).join(', ')}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Plano selector ────────────────────────────────────────────────────────────
const PLANS: MuvvPlan[] = ['go', 'pro', 'global']

// ── Tela principal ────────────────────────────────────────────────────────────
export function DriverMapScreen({ onAccept }: DriverMapScreenProps) {
  const { setProfile, brlToEur } = useFreight()

  const [origin,  setOrigin]  = useState<GeoPoint>(STATIC_POINTS[0])
  const [dest,    setDest]    = useState<GeoPoint>(STATIC_POINTS[1])
  const [plan,    setPlan]    = useState<MuvvPlan>('global')

  const distanceKm = useMemo(() => roadKm(origin.coords, dest.coords), [origin, dest])
  const gross      = useMemo(() => calcGross(distanceKm, plan), [distanceKm, plan])
  const { fee, net, rate } = useMemo(() => calcNet(gross, plan), [gross, plan])
  const tariff = PLAN_TABLE[plan]

  const exceedKm = Math.max(0, distanceKm - tariff.freeKm)
  const formulaParts = exceedKm > 0
    ? `R$${formatBRL(tariff.baseValue)} + ${exceedKm}km×R$${formatBRL(tariff.costPerKm)}`
    : `R$${formatBRL(tariff.baseValue)} (saída — ${tariff.freeKm}km inclusos)`

  const freight: Freight = {
    from: origin.name, to: dest.name,
    distance: `${distanceKm} km`, distanceKm,
    value: parseFloat(gross.toFixed(2)),
    category: tariff.categories[0],
    plan,
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">

      {/* ── Mapa de fundo ────────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <ZpeMap points={[origin, dest]} mapKey={`${origin.name}→${dest.name}`} />
      </div>

      {/* ── Painel superior ──────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <div
          className="px-4 pt-4 pb-3 pointer-events-auto"
          style={{ background: 'linear-gradient(180deg, rgba(234,239,242,0.98) 0%, rgba(234,239,242,0.88) 75%, transparent 100%)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <MuvvLogo variant="full" size={28} />
            <div className="flex items-center gap-2">
              <span className="bg-muvv-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full">● Online</span>
              <button
                onClick={() => setProfile('hub')}
                className="text-muvv-muted text-[10px] border border-muvv-border rounded-full px-2.5 py-1 cursor-pointer bg-white/80"
              >← Hub</button>
            </div>
          </div>

          {/* ── Campos de busca de endereço ─────────────────────────── */}
          <div className="flex gap-2 items-start mb-2.5">
            <AddressSearchInput
              label="📍 Origem" icon="🟦"
              value={origin} onChange={setOrigin}
              placeholder="De onde parte o frete?"
            />
            <div className="flex-shrink-0 mt-7">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8AAEBB" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <AddressSearchInput
              label="🎯 Destino" icon="🔴"
              value={dest} onChange={setDest}
              placeholder="Onde entregar?"
            />
          </div>

          {/* ── Plano / Tipo de veículo ──────────────────────────────── */}
          <div className="flex gap-2">
            {PLANS.map(p => {
              const t = PLAN_TABLE[p]
              const active = plan === p
              return (
                <button key={p} onClick={() => setPlan(p)}
                  aria-pressed={active}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                    active ? 'text-white' : 'bg-white/80 border-muvv-border text-muvv-dark'
                  }`}
                  style={active ? { background: t.color, borderColor: t.color, boxShadow: `0 4px 12px ${t.color}40` } : {}}
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="text-[11px] font-bold">{t.shortLabel}</span>
                  <span className={`text-[9px] ${active ? 'text-white/75' : 'text-muvv-muted'}`}>
                    {(t.rate * 100).toFixed(0)}% taxa
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Card de Frete ─────────────────────────────────────────────── */}
      <div
        className="absolute bottom-4 left-4 right-4 z-[1000] rounded-[20px] p-4 backdrop-blur-md shadow-freight"
        style={{
          background:  'rgba(255,255,255,0.97)',
          borderTop:   `3px solid ${tariff.color}`,
          boxShadow:   '0 8px 32px rgba(26,43,53,0.15), 0 0 0 1px rgba(255,255,255,0.6) inset',
        }}
      >
        {/* Rota visual */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-muvv-secondary" />
            <div className="w-0.5 h-5 rounded-sm" style={{ background: `linear-gradient(#57A6C1, ${tariff.color})` }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: tariff.color, boxShadow: `0 0 8px ${tariff.color}80` }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-muvv-muted text-[10px]">De</p>
            <p className="text-muvv-dark text-sm font-semibold truncate leading-tight mb-1">{origin.name}</p>
            <p className="text-muvv-muted text-[10px]">Para</p>
            <p className="text-muvv-dark text-sm font-semibold truncate leading-tight">{dest.name}</p>
          </div>
          <div className="rounded-xl px-2.5 py-1.5 text-center flex-shrink-0"
               style={{ background: `${tariff.color}15` }}>
            <p className="text-[12px] font-extrabold" style={{ color: tariff.color }}>{distanceKm} km</p>
            <p className="text-muvv-muted text-[9px] mt-0.5">{tariff.label}</p>
          </div>
        </div>

        {/* Fórmula de custo */}
        <div className="rounded-xl px-3 py-1.5 mb-3 border"
             style={{ background: `${tariff.color}08`, borderColor: `${tariff.color}22` }}>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: tariff.color }}>
            Composição tarifária
          </p>
          <p className="text-muvv-muted text-[10px]">
            {formulaParts} = <span className="font-bold text-muvv-dark">R$ {formatBRL(gross)}</span>
          </p>
        </div>

        {/* Três valores */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="bg-muvv-primary rounded-xl p-2">
            <p className="text-muvv-muted text-[9px]">Bruto</p>
            <p className="text-muvv-dark text-[13px] font-bold leading-tight">R$ {formatBRL(gross)}</p>
          </div>
          <div className="rounded-xl p-2" style={{ background: '#FFF8E7' }}>
            <p className="text-muvv-prestige text-[9px]">Taxa ({(rate*100).toFixed(1)}%)</p>
            <p className="text-muvv-prestige text-[13px] font-bold leading-tight">-{formatBRL(fee)}</p>
          </div>
          <div className="rounded-xl p-2 border" style={{ background: `${tariff.color}12`, borderColor: `${tariff.color}30` }}>
            <p className="text-[9px] font-bold" style={{ color: tariff.color }}>LÍQUIDO</p>
            <p className="text-[13px] font-extrabold" style={{ color: tariff.color }}>R$ {formatBRL(net)}</p>
            <p className="text-[9px]" style={{ color: tariff.color, opacity: 0.7 }}>≈€{formatBRL(brlToEur(net))}</p>
          </div>
        </div>

        <SlideToAccept onAccept={() => onAccept(freight)} />
      </div>
    </div>
  )
}
