// ─── screens/OrderDetailScreen.tsx — Calculadora de Lucro v4 ─────────────────
//
// Exibe o breakdown completo do frete aceito pelo motorista:
//   Bruto   = BASE + MAX(0, dist − 5) × custo_km  (services/calculations)
//   Taxa    = Bruto × rate%
//   Líquido = Bruto − Taxa
//   EUR     = Líquido / eurRate  (via FreightContext → hook em tempo real)
//
// O motorista pode trocar o plano e ver o recálculo instantâneo.

import { useState }          from 'react'
import { Icon, ICON_PATHS }  from '@/components/Icon'
import { useFreight }        from '@/context/FreightContext'
import {
  calcNet, calcGross,
  formatBRL, formatEUR,
  PLAN_TABLE, MUVV_RATES,
} from '@/services/calculations'
import { CATEGORY_TO_PLAN }  from '@/services/calculations'
import type { Freight, MuvvPlan } from '@/types'

interface OrderDetailScreenProps {
  freight: Freight | null
}

// Planos disponíveis para seleção manual
const PLAN_BUTTONS: { id: MuvvPlan; emoji: string }[] = [
  { id: 'go',     emoji: '🚐' },
  { id: 'pro',    emoji: '🚛' },
  { id: 'global', emoji: '🌍' },
]

export function OrderDetailScreen({ freight }: OrderDetailScreenProps) {
  // EUR em tempo real via contexto global
  const { brlToEur, eurRate } = useFreight()

  // Plano inicial vem da categoria do frete aceito
  const initialPlan = freight?.plan ?? CATEGORY_TO_PLAN[freight?.category ?? 'zpe']
  const [plan, setPlan] = useState<MuvvPlan>(initialPlan)

  const distanceKm         = freight?.distanceKm ?? 18
  const gross              = calcGross(distanceKm, plan)
  const { fee, net, rate } = calcNet(gross, plan)
  const tariff             = PLAN_TABLE[plan]
  const exceedKm           = Math.max(0, distanceKm - tariff.freeKm)

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Hero — cabeçalho com valor líquido em destaque ────────── */}
      <div className="bg-gradient-header-dark px-5 pt-16 pb-6 rounded-b-[28px]">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-white/60 text-sm">Detalhe do Frete</p>
          <span
            className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: tariff.color }}>
            {tariff.emoji} {tariff.label}
          </span>
        </div>

        <h1 className="text-white text-lg font-extrabold mb-4 leading-tight">
          {freight?.from ?? 'Origem'} → {freight?.to ?? 'Destino'}
        </h1>

        {/* Valor líquido — destaque máximo */}
        <div className="bg-muvv-accent/12 rounded-[18px] p-5 border-2 border-muvv-accent/30">
          <p className="text-white/60 text-xs mb-2 tracking-wide">VOCÊ RECEBERÁ (VALOR LÍQUIDO)</p>
          <div className="flex items-end gap-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-muvv-accent text-lg font-semibold">R$</span>
                <span className="text-muvv-accent text-glow-accent font-black" style={{ fontSize: 44 }}>
                  {formatBRL(net)}
                </span>
              </div>
              {/* EUR em tempo real */}
              <p className="text-muvv-accent/70 text-sm font-semibold mt-0.5">
                ≈ € {formatEUR(brlToEur(net))}
                <span className="text-[10px] font-normal opacity-60 ml-1">(1€=R${eurRate.toFixed(2)})</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* ── Seletor de plano ─────────────────────────────────────── */}
        <div>
          <p className="text-muvv-dark text-sm font-bold mb-2">Plano / Tipo de Veículo</p>
          <div className="grid grid-cols-3 gap-2">
            {PLAN_BUTTONS.map(({ id, emoji }) => {
              const isActive = plan === id
              const t        = PLAN_TABLE[id]
              return (
                <button
                  key={id}
                  onClick={() => setPlan(id)}
                  className={`rounded-2xl p-3 border-none cursor-pointer transition-all duration-200 ${
                    isActive ? 'text-white' : 'bg-white text-muvv-dark shadow-card-sm'
                  }`}
                  style={isActive ? { background: t.color, boxShadow: `0 4px 16px ${t.color}44` } : {}}>
                  <span className="text-lg block mb-0.5">{emoji}</span>
                  <p className={`text-xs font-bold ${isActive ? 'text-white' : 'text-muvv-dark'}`}>
                    {t.shortLabel}
                  </p>
                  <p className={`text-[9px] mt-0.5 ${isActive ? 'text-white/80' : 'text-muvv-muted'}`}>
                    {(MUVV_RATES[t.categories[0]] * 100).toFixed(1)}% taxa
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Composição tarifária ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 shadow-card">
          <p className="text-muvv-dark text-sm font-bold mb-3">Composição Tarifária</p>
          <div className="space-y-2.5">
            {/* Distância */}
            <div className="flex justify-between text-sm">
              <span className="text-muvv-muted">Distância total</span>
              <span className="text-muvv-dark font-semibold">{distanceKm} km</span>
            </div>
            {/* Saída */}
            <div className="flex justify-between text-sm">
              <span className="text-muvv-muted">
                Saída ({tariff.freeKm}km livres inclusos)
              </span>
              <span className="text-muvv-dark font-semibold">R$ {formatBRL(tariff.baseValue)}</span>
            </div>
            {/* KM excedente */}
            {exceedKm > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muvv-muted">
                  {exceedKm}km × R$ {formatBRL(tariff.costPerKm)}/km
                </span>
                <span className="text-muvv-dark font-semibold">
                  R$ {formatBRL(exceedKm * tariff.costPerKm)}
                </span>
              </div>
            )}
            {/* Divisor */}
            <div className="border-t border-muvv-border pt-2 flex justify-between">
              <span className="text-muvv-dark font-bold">Valor Bruto</span>
              <span className="text-muvv-dark font-bold">R$ {formatBRL(gross)}</span>
            </div>
          </div>
        </div>

        {/* ── Breakdown financeiro ─────────────────────────────────── */}
        <div className="bg-white rounded-[18px] overflow-hidden shadow-card">

          {/* Taxa Muvv */}
          <div className="flex justify-between items-start px-5 py-4 border-b border-muvv-border bg-red-50/40">
            <div>
              <p className="text-muvv-dark text-sm">
                Taxa {tariff.label} ({(rate * 100).toFixed(1)}%)
              </p>
              <p className="text-muvv-muted text-[10px] mt-0.5">
                Plataforma, seguro e suporte
              </p>
            </div>
            <span className="text-red-400 text-[15px] font-bold">
              − R$ {formatBRL(fee)}
            </span>
          </div>

          {/* Líquido */}
          <div className="flex justify-between items-start px-5 py-4 bg-gradient-accent-light">
            <div>
              <p className="text-muvv-accent text-sm font-bold">✓ VALOR LÍQUIDO</p>
              <p className="text-muvv-secondary text-[10px] mt-0.5">
                Depositado em até 2h após entrega
              </p>
            </div>
            <div className="text-right">
              <p className="text-muvv-accent text-[22px] font-black">
                R$ {formatBRL(net)}
              </p>
              <p className="text-muvv-accent/70 text-[11px] font-semibold">
                € {formatEUR(brlToEur(net))}
              </p>
            </div>
          </div>
        </div>

        {/* ── Conversão ZPE Gold ───────────────────────────────────── */}
        {plan === 'global' && (
          <div className="bg-gradient-prestige rounded-2xl p-4 border border-muvv-prestige/20 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-muvv-prestige/15 flex items-center justify-center flex-shrink-0">
              <Icon path={ICON_PATHS.euro} size={22} color="#DAA520" />
            </div>
            <div>
              <p className="text-muvv-prestige text-sm font-bold">Muvv Global · ZPE Export</p>
              <p className="text-amber-700 text-2xl font-black">€ {formatEUR(brlToEur(net))}</p>
              <p className="text-amber-600 text-[10px]">
                Câmbio em tempo real: 1 EUR = R$ {eurRate.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* ── Selo seguro ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-card border border-muvv-prestige/15">
          <Icon path={ICON_PATHS.shield} size={24} color="#DAA520" />
          <div>
            <p className="text-muvv-prestige text-xs font-bold">
              Cargo Insurance Gold · Muvv Holding
            </p>
            <p className="text-muvv-muted text-xs">
              Cobertura total inclusa — Global e Pro
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
