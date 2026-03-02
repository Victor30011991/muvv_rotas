// ─── OrderDetailScreen — Calculadora + Simulador de Ganhos ──────────────────

import { useState }    from 'react'
import { Icon, ICON_PATHS } from '@/components/Icon'
import { EarningsSimulator } from '@/components/EarningsSimulator'
import { calcNet, brlToEur, formatBRL, formatEUR, MUVV_RATES, CATEGORY_LABELS } from '@/utils/calculations'
import type { Freight, FreightCategory } from '@/types'

interface OrderDetailScreenProps {
  freight: Freight | null
}

const CAT_STYLES: Record<FreightCategory, { label: string; desc: string; activeColor: string }> = {
  light: { label: 'Leve',       desc: 'Até 500kg',       activeColor: '#57A6C1' },
  heavy: { label: 'Pesado',     desc: 'Acima de 500kg',  activeColor: '#3D6B7D' },
  zpe:   { label: 'ZPE Export', desc: 'Internacional',   activeColor: '#DAA520' },
}

export function OrderDetailScreen({ freight }: OrderDetailScreenProps) {
  const [category,   setCategory]   = useState<FreightCategory>(freight?.category ?? 'zpe')
  const [grossInput, setGrossInput] = useState<number>(freight?.value ?? 340)

  const { gross, fee, net, rate } = calcNet(grossInput, category)

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-header-dark px-5 pt-16 pb-6 rounded-b-[28px]">
        <p className="text-white/60 text-sm mb-1">Detalhe do Frete</p>
        <h1 className="text-white text-xl font-extrabold mb-4 leading-tight">
          {freight?.to ?? 'ZPE Piauí – Terminal A'}
        </h1>

        <div className="bg-muvv-accent/12 rounded-[18px] p-5 border-2 border-muvv-accent/30">
          <p className="text-white/60 text-xs mb-1 tracking-wide">VOCÊ RECEBERÁ (VALOR LÍQUIDO)</p>
          <div className="flex items-baseline gap-2">
            <span className="text-muvv-accent text-base font-semibold">R$</span>
            <span className="text-muvv-accent text-glow-accent font-black leading-none"
                  style={{ fontSize: 46 }}>
              {formatBRL(net)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Categoria */}
        <div>
          <p className="text-muvv-dark text-sm font-bold mb-2">Categoria do Frete</p>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(CAT_STYLES) as FreightCategory[]).map(cat => {
              const isActive = category === cat
              const style    = CAT_STYLES[cat]
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-2xl p-3 border-none cursor-pointer transition-all duration-200 ${
                    isActive ? 'text-white' : 'bg-white text-muvv-dark shadow-card-sm'
                  }`}
                  style={isActive
                    ? { background: style.activeColor, boxShadow: `0 4px 16px ${style.activeColor}44` }
                    : {}
                  }
                >
                  <p className={`text-xs font-bold ${isActive ? 'text-white' : 'text-muvv-dark'}`}>
                    {style.label}
                  </p>
                  <p className={`text-[9px] mt-0.5 ${isActive ? 'text-white/80' : 'text-muvv-muted'}`}>
                    {(MUVV_RATES[cat] * 100).toFixed(0)}% taxa
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Input valor bruto */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <p className="text-muvv-dark text-sm font-semibold mb-2">Valor Bruto do Frete</p>
          <div className="flex items-center gap-3">
            <span className="text-muvv-muted text-lg font-bold">R$</span>
            <input
              type="number"
              value={grossInput}
              onChange={e => setGrossInput(Number(e.target.value))}
              className="flex-1 bg-transparent outline-none text-muvv-dark text-3xl font-black"
              aria-label="Valor bruto do frete em reais"
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white rounded-[18px] overflow-hidden shadow-card">
          <div className="flex justify-between items-center px-5 py-4 border-b border-muvv-border">
            <p className="text-muvv-dark text-sm">Valor Bruto</p>
            <span className="text-muvv-dark text-[15px] font-bold">R$ {formatBRL(gross)}</span>
          </div>
          <div className="flex justify-between items-start px-5 py-4 border-b border-muvv-border bg-red-50/50">
            <div>
              <p className="text-muvv-dark text-sm">
                Taxa Muvv ({(rate * 100).toFixed(0)}%) – {CATEGORY_LABELS[category]}
              </p>
              <p className="text-muvv-muted text-[10px] mt-0.5">Plataforma, seguro e suporte</p>
            </div>
            <span className="text-red-400 text-[15px] font-bold">- R$ {formatBRL(fee)}</span>
          </div>
          <div className="flex justify-between items-start px-5 py-4 bg-gradient-accent-light">
            <div>
              <p className="text-muvv-accent text-sm font-bold">✓ VALOR LÍQUIDO</p>
              <p className="text-muvv-secondary text-[10px] mt-0.5">Depositado em até 2h</p>
            </div>
            <span className="text-muvv-accent text-[22px] font-black">R$ {formatBRL(net)}</span>
          </div>
        </div>

        {/* Euro ZPE */}
        {category === 'zpe' && (
          <div className="bg-gradient-prestige rounded-2xl p-4 border border-muvv-prestige/20 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-muvv-prestige/15 flex items-center justify-center flex-shrink-0">
              <Icon path={ICON_PATHS.euro} size={22} color="#DAA520" />
            </div>
            <div>
              <p className="text-muvv-prestige text-sm font-bold">Frete ZPE – Equivalente Euro</p>
              <p className="text-amber-700 text-xl font-black">€ {formatEUR(brlToEur(net))} EUR</p>
              <p className="text-amber-600 text-[10px]">Câmbio: 1 EUR = R$ 5,50</p>
            </div>
          </div>
        )}

        {/* ── SIMULADOR DE GANHOS ─────────────────────────────────── */}
        <EarningsSimulator
          initialGross={grossInput}
          initialCategory={category}
        />

        {/* Seguro Gold */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-card border border-muvv-prestige/15">
          <Icon path={ICON_PATHS.shield} size={24} color="#DAA520" />
          <div>
            <p className="text-muvv-prestige text-xs font-bold">Cargo Insurance Gold · Muvv Holding</p>
            <p className="text-muvv-muted text-xs">Cobertura total inclusa para fretes ZPE</p>
          </div>
        </div>

      </div>
    </div>
  )
}