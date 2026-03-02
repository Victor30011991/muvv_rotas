// ─── HomeScreen — Simulador de Rotas v3 ──────────────────────────────────────
// Painel de simulação com seleção livre de:
//   • Origem  (select — qualquer ponto do WAYPOINTS)
//   • Destino (select — qualquer ponto do WAYPOINTS, diferente da origem)
//   • Tipo de Veículo (3 botões: Simples, Caminhão, Logística ZPE)
//
// Cálculo em tempo real:
//   distância = roadDistanceKm(origem, destino)  via Haversine × 1.30
//   bruto     = calcGross(distância, categoria)   usando a tabela tarifária v3
//   líquido   = bruto × (1 - taxa)
//
// O Card de Frete atualiza conforme qualquer seleção muda.
// SlideToAccept → envia Freight para OrderDetailScreen.

import { useState, useMemo } from 'react'
import { ZpeMap }            from '@/components/ZpeMap'
import { SlideToAccept }     from '@/components/SlideToAccept'
import {
  calcGross, calcNet, formatBRL, TARIFF_TABLE,
} from '@/utils/calculations'
import {
  WAYPOINTS, DEFAULT_ORIGIN_IDX, DEFAULT_DESTINATION_IDX, roadDistanceKm,
} from '@/utils/routes'
import type { Freight, FreightCategory, RouteWaypoint } from '@/types'

interface HomeScreenProps {
  onOrderDetail: (freight: Freight) => void
}

// ── Configuração dos botões de tipo de veículo ───────────────────────────────
const VEHICLE_TYPES: { id: FreightCategory; emoji: string; label: string; sublabel: string }[] = [
  { id: 'light', emoji: '🚐', label: 'Simples',    sublabel: 'Fiorino / Van' },
  { id: 'heavy', emoji: '🚛', label: 'Caminhão',   sublabel: 'Médio / Pesado' },
  { id: 'zpe',   emoji: '🏭', label: 'Logística',  sublabel: 'ZPE / Lote' },
]

// ── Cores dos veículos (herda a cor do tipo, não mais da rota) ───────────────
const VEHICLE_COLOR: Record<FreightCategory, string> = {
  light: '#57A6C1',
  heavy: '#3D6B7D',
  zpe:   '#DAA520',
}

// ── CustomSelect inline — sem biblioteca externa ─────────────────────────────
interface SelectProps {
  label: string
  value: number
  options: RouteWaypoint[]
  exclude?: number
  onChange: (idx: number) => void
  iconColor?: string
}

function PointSelect({ label, value, options, exclude, onChange, iconColor = '#57A6C1' }: SelectProps) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-muvv-muted text-[10px] font-medium mb-1 px-1">{label}</p>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full appearance-none bg-white border-2 border-muvv-border rounded-xl
                     px-3 py-2 pr-8 text-[13px] font-semibold text-muvv-dark
                     cursor-pointer outline-none transition-colors duration-150
                     focus:border-muvv-accent focus:ring-2 focus:ring-muvv-accent/20"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          {options.map((wp, idx) => (
            <option key={wp.name} value={idx} disabled={idx === exclude}>
              {wp.name}
            </option>
          ))}
        </select>
        {/* Chevron custom */}
        <div
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: iconColor }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function HomeScreen({ onOrderDetail }: HomeScreenProps) {
  // ── Estado do simulador ──────────────────────────────────────────────────
  const [originIdx,  setOriginIdx]  = useState(DEFAULT_ORIGIN_IDX)
  const [destIdx,    setDestIdx]    = useState(DEFAULT_DESTINATION_IDX)
  const [category,   setCategory]   = useState<FreightCategory>('zpe')

  // ── Derivados — recalculados em tempo real via useMemo ───────────────────
  const origin  = WAYPOINTS[originIdx]
  const dest    = WAYPOINTS[destIdx]

  // Estimativa de distância rodoviária (Haversine × 1.30)
  const distanceKm = useMemo(
    () => roadDistanceKm(origin.coords, dest.coords),
    [origin, dest]
  )

  // Valor bruto pela tabela tarifária Muvv v3
  const gross = useMemo(
    () => calcGross(distanceKm, category),
    [distanceKm, category]
  )

  const { fee, net, rate } = calcNet(gross, category)
  const tariff = TARIFF_TABLE[category]

  // Objeto Freight que será passado para OrderDetailScreen
  const freight: Freight = {
    from:        origin.name,
    to:          dest.name,
    distance:    `${distanceKm} km`,
    distanceKm,
    value:       parseFloat(gross.toFixed(2)),
    category,
  }

  // Garante que destino não seja igual à origem ao mudar origem
  const handleOriginChange = (idx: number) => {
    setOriginIdx(idx)
    if (idx === destIdx) setDestIdx(idx === 0 ? 1 : 0)
  }

  const accentColor = VEHICLE_COLOR[category]

  // Fórmula formatada para exibição no card
  const exceedKm   = Math.max(0, distanceKm - tariff.freeKm)
  const formulaStr = exceedKm > 0
    ? `R$ ${formatBRL(tariff.baseValue)} + ${exceedKm}km × R$ ${formatBRL(tariff.costPerKm)}`
    : `R$ ${formatBRL(tariff.baseValue)} (saída — dentro dos ${tariff.freeKm}km inclusos)`

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">

      {/* ── Mapa — ocupa toda a tela por baixo dos painéis ──────────── */}
      <div className="absolute inset-0 z-0">
        <ZpeMap
          waypoints={[origin, dest]}
          mapKey={`${originIdx}-${destIdx}`}
        />
      </div>

      {/* ── Painel superior — controles de simulação ─────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-2 pointer-events-auto"
          style={{ background: 'linear-gradient(180deg, rgba(234,239,242,0.98) 0%, rgba(234,239,242,0.92) 70%, transparent 100%)' }}
        >
          <div>
            <p className="text-muvv-muted text-[10px] font-medium tracking-wide uppercase">Simulador de Rotas</p>
            <h2 className="text-muvv-dark text-base font-extrabold leading-tight">Muvv Rotas 🌊</h2>
          </div>
          <div className="flex gap-1.5">
            <span className="bg-muvv-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              ● Online
            </span>
            <span className="bg-muvv-prestige text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
              ZPE
            </span>
          </div>
        </div>

        {/* ── Seletores de Origem e Destino ─────────────────────────────
            Cada troca recalcula distância → bruto → líquido em tempo real. */}
        <div
          className="px-4 pb-2 pointer-events-auto"
          style={{ background: 'linear-gradient(180deg, rgba(234,239,242,0.92) 0%, rgba(234,239,242,0.6) 80%, transparent 100%)' }}
        >
          <div className="flex gap-2 items-end">
            <PointSelect
              label="📍 Origem"
              value={originIdx}
              options={WAYPOINTS}
              exclude={destIdx}
              onChange={handleOriginChange}
              iconColor="#57A6C1"
            />

            {/* Ícone separador */}
            <div className="flex-shrink-0 pb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8AAEBB" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <PointSelect
              label="🎯 Destino"
              value={destIdx}
              options={WAYPOINTS}
              exclude={originIdx}
              onChange={setDestIdx}
              iconColor={accentColor}
            />
          </div>

          {/* ── Seletor de Tipo de Veículo ─────────────────────────────
              Cada botão muda a categoria → taxa e custo/km mudam. */}
          <div className="flex gap-2 mt-2">
            {VEHICLE_TYPES.map(vt => {
              const isActive = category === vt.id
              return (
                <button
                  key={vt.id}
                  onClick={() => setCategory(vt.id)}
                  aria-pressed={isActive}
                  className={`
                    flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl
                    border-2 cursor-pointer transition-all duration-200
                    ${isActive ? 'text-white shadow-md' : 'bg-white/80 text-muvv-dark border-muvv-border'}
                  `}
                  style={isActive
                    ? {
                        background:   VEHICLE_COLOR[vt.id],
                        borderColor:  VEHICLE_COLOR[vt.id],
                        boxShadow:    `0 4px 14px ${VEHICLE_COLOR[vt.id]}40`,
                      }
                    : {}
                  }
                >
                  <span className="text-base leading-none">{vt.emoji}</span>
                  <span className="text-[11px] font-bold leading-tight">{vt.label}</span>
                  <span className={`text-[9px] ${isActive ? 'text-white/75' : 'text-muvv-muted'}`}>
                    {vt.sublabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Card de Frete — flutua sobre o mapa ──────────────────────── */}
      <div
        className="absolute bottom-4 left-4 right-4 z-[1000] rounded-[20px] p-4 shadow-freight backdrop-blur-md"
        style={{
          background:   'rgba(255,255,255,0.97)',
          borderTop:    `3px solid ${accentColor}`,
          boxShadow:    `0 8px 32px rgba(26,43,53,0.16), 0 0 0 1px rgba(255,255,255,0.6) inset`,
        }}
      >
        {/* ── Linha de rota — trilha visual ─────────────────────────── */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-muvv-secondary" />
            <div
              className="w-0.5 h-5 rounded-sm"
              style={{ background: `linear-gradient(#57A6C1, ${accentColor})` }}
            />
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}80` }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-muvv-muted text-[10px]">Origem</p>
            <p className="text-muvv-dark text-sm font-semibold truncate leading-tight mb-1">
              {origin.name}
            </p>
            <p className="text-muvv-muted text-[10px]">Destino</p>
            <p className="text-muvv-dark text-sm font-semibold truncate leading-tight">
              {dest.name}
            </p>
          </div>

          {/* Badge distância + tipo */}
          <div
            className="rounded-xl px-2.5 py-1.5 text-center flex-shrink-0"
            style={{ background: `${accentColor}15` }}
          >
            <p className="text-[12px] font-extrabold" style={{ color: accentColor }}>
              {distanceKm} km
            </p>
            <p className="text-muvv-muted text-[9px] mt-0.5">{tariff.label}</p>
          </div>
        </div>

        {/* ── Fórmula de custo — transparência financeira ───────────────
            Exibe como o valor bruto foi calculado passo a passo. */}
        <div
          className="rounded-xl px-3 py-1.5 mb-3 border"
          style={{ background: `${accentColor}08`, borderColor: `${accentColor}22` }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: accentColor }}>
            Composição tarifária
          </p>
          <p className="text-muvv-muted text-[10px] leading-relaxed">
            {formulaStr}
            {' = '}
            <span className="font-bold text-muvv-dark">R$ {formatBRL(gross)}</span>
          </p>
        </div>

        {/* ── Três valores principais ───────────────────────────────── */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {/* Bruto */}
          <div className="bg-muvv-primary rounded-xl p-2">
            <p className="text-muvv-muted text-[9px]">Bruto</p>
            <p className="text-muvv-dark text-[13px] font-bold leading-tight">
              R$ {formatBRL(gross)}
            </p>
          </div>

          {/* Taxa Muvv */}
          <div className="bg-muvv-prestige-light rounded-xl p-2">
            <p className="text-muvv-prestige text-[9px]">Taxa ({(rate * 100).toFixed(0)}%)</p>
            <p className="text-muvv-prestige text-[13px] font-bold leading-tight">
              -{formatBRL(fee)}
            </p>
          </div>

          {/* Líquido — máximo destaque */}
          <div
            className="rounded-xl p-2 border"
            style={{ background: `${accentColor}12`, borderColor: `${accentColor}30` }}
          >
            <p className="text-[9px] font-bold" style={{ color: accentColor }}>LÍQUIDO</p>
            <p className="text-[13px] font-extrabold" style={{ color: accentColor }}>
              R$ {formatBRL(net)}
            </p>
          </div>
        </div>

        {/* Slide to Accept */}
        <SlideToAccept onAccept={() => onOrderDetail(freight)} />
      </div>
    </div>
  )
}
