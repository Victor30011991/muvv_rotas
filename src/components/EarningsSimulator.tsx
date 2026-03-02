// ─── EarningsSimulator — Simulador de Ganhos e Custos ────────────────────────
// Projeções diárias, semanais e mensais separando logística de finanças.

import { useState } from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import { calcSimProjection, formatBRL, CATEGORY_LABELS } from '@/utils/calculations'
import type { FreightCategory, SimPeriod } from '@/types'

interface EarningsSimulatorProps {
  initialGross:    number
  initialCategory: FreightCategory
}

const PERIODS: { id: SimPeriod; label: string }[] = [
  { id: 'daily',   label: 'Diário'  },
  { id: 'weekly',  label: 'Semanal' },
  { id: 'monthly', label: 'Mensal'  },
]

export function EarningsSimulator({ initialGross, initialCategory }: EarningsSimulatorProps) {
  const [period,      setPeriod]      = useState<SimPeriod>('weekly')
  const [grossValue,  setGrossValue]  = useState(initialGross)
  const [category,    setCategory]    = useState<FreightCategory>(initialCategory)
  const [freightsDay, setFreightsDay] = useState(3)
  const [fuelPerKm,   setFuelPerKm]   = useState(0.45)
  const [avgKm,       setAvgKm]       = useState(25)

  const proj = calcSimProjection(
    grossValue * (1 - 0.15), // net approx
    freightsDay,
    fuelPerKm,
    avgKm,
    grossValue,
    category,
    period,
  )

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-card border border-muvv-border">
      {/* Header */}
      <div className="bg-gradient-header-dark px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muvv-accent/20 flex items-center justify-center">
          <Icon path={ICON_PATHS.trending} size={18} color="#1CC8C8" />
        </div>
        <div>
          <p className="text-white font-extrabold text-[15px]">Simulador de Ganhos</p>
          <p className="text-white/60 text-[11px]">Projeção financeira por período</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Seletor de período */}
        <div className="grid grid-cols-3 gap-2">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`py-2 rounded-xl text-sm font-bold transition cursor-pointer border-none ${
                period === p.id
                  ? 'bg-muvv-accent text-white shadow-accent'
                  : 'bg-muvv-primary text-muvv-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* ── Inputs de logística ─────────────────────────────────────── */}
        <div className="bg-muvv-primary rounded-2xl p-4 space-y-3">
          <p className="text-muvv-dark text-xs font-extrabold uppercase tracking-wide">🚛 Logística</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muvv-muted text-[11px] mb-1 block">Fretes/dia</label>
              <input
                type="number"
                value={freightsDay}
                onChange={e => setFreightsDay(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white rounded-xl px-3 py-2 text-muvv-dark text-sm font-bold outline-none focus:ring-2 focus:ring-muvv-accent/30"
                min={1} max={20}
              />
            </div>
            <div>
              <label className="text-muvv-muted text-[11px] mb-1 block">Km médio/frete</label>
              <input
                type="number"
                value={avgKm}
                onChange={e => setAvgKm(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white rounded-xl px-3 py-2 text-muvv-dark text-sm font-bold outline-none focus:ring-2 focus:ring-muvv-accent/30"
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muvv-muted text-[11px] mb-1 block">Valor bruto (R$)</label>
              <input
                type="number"
                value={grossValue}
                onChange={e => setGrossValue(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white rounded-xl px-3 py-2 text-muvv-dark text-sm font-bold outline-none focus:ring-2 focus:ring-muvv-accent/30"
                min={1}
              />
            </div>
            <div>
              <label className="text-muvv-muted text-[11px] mb-1 block">Combustível R$/km</label>
              <input
                type="number"
                value={fuelPerKm}
                step={0.05}
                onChange={e => setFuelPerKm(Math.max(0, Number(e.target.value)))}
                className="w-full bg-white rounded-xl px-3 py-2 text-muvv-dark text-sm font-bold outline-none focus:ring-2 focus:ring-muvv-accent/30"
                min={0}
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="text-muvv-muted text-[11px] mb-1 block">Categoria</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['light','heavy','zpe'] as FreightCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer border-none ${
                    category === cat ? 'bg-muvv-secondary text-white' : 'bg-white text-muvv-muted'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Resultados financeiros ─────────────────────────────────── */}
        <div className="bg-muvv-accent-light rounded-2xl p-4 border border-muvv-accent/20 space-y-2">
          <p className="text-muvv-accent text-xs font-extrabold uppercase tracking-wide">💰 Análise Financeira</p>

          <div className="grid grid-cols-2 gap-2">
            {/* Receita bruta */}
            <div className="bg-white rounded-xl p-3">
              <p className="text-muvv-muted text-[10px]">Receita Bruta</p>
              <p className="text-muvv-dark text-base font-black">R$ {formatBRL(proj.revenue)}</p>
              <p className="text-muvv-muted text-[9px]">{proj.deliveries} fretes</p>
            </div>

            {/* Taxa Muvv */}
            <div className="bg-white rounded-xl p-3">
              <p className="text-red-400 text-[10px]">Taxa Muvv</p>
              <p className="text-red-400 text-base font-black">- R$ {formatBRL(proj.fees)}</p>
              <p className="text-muvv-muted text-[9px]">Plataforma</p>
            </div>

            {/* Combustível */}
            <div className="bg-white rounded-xl p-3">
              <p className="text-orange-400 text-[10px]">Combustível</p>
              <p className="text-orange-500 text-base font-black">- R$ {formatBRL(proj.fuel)}</p>
              <p className="text-muvv-muted text-[9px]">{proj.deliveries * avgKm} km total</p>
            </div>

            {/* Lucro líquido */}
            <div className="bg-muvv-accent/10 rounded-xl p-3 border border-muvv-accent/25">
              <p className="text-muvv-accent text-[10px] font-bold">Lucro Líquido</p>
              <p className={`text-base font-black ${proj.profit >= 0 ? 'text-muvv-accent' : 'text-red-500'}`}>
                R$ {formatBRL(Math.abs(proj.profit))}
              </p>
              <p className="text-muvv-muted text-[9px]">{proj.profit >= 0 ? 'Positivo ✓' : 'Prejuízo ⚠'}</p>
            </div>
          </div>

          {/* Barra de margem */}
          <div className="mt-1">
            <div className="flex justify-between text-[10px] text-muvv-muted mb-1">
              <span>Margem de lucro</span>
              <span className="font-bold text-muvv-accent">
                {proj.revenue > 0 ? ((proj.profit / proj.revenue) * 100).toFixed(1) : '0'}%
              </span>
            </div>
            <div className="h-2 bg-muvv-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-road rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, Math.min(100, (proj.profit / proj.revenue) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}