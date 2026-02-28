// ─── HomeScreen — Mapa + Card de Frete ───────────────────────────────────────
// Tela principal do app. Exibe o mapa ZPE e um card de frete disponível.
// O motorista pode deslizar para aceitar e ir ao OrderDetailScreen.

import { ZpeMap }        from '@/components/ZpeMap'
import { SlideToAccept } from '@/components/SlideToAccept'
import { calcNet, formatBRL } from '@/utils/calculations'
import type { Freight } from '@/types'

interface HomeScreenProps {
  onOrderDetail: (freight: Freight) => void
}

// ── Frete de exemplo — em produção viria de uma API ─────────────────────────
// 🔧 ALTERE AQUI para simular diferentes fretes
const DEMO_FREIGHT: Freight = {
  from:     'Parnaíba Centro',
  to:       'ZPE Piauí – Terminal A',
  distance: '23 km',
  value:    340,
  category: 'zpe',
}

export function HomeScreen({ onOrderDetail }: HomeScreenProps) {
  const { net, fee, rate } = calcNet(DEMO_FREIGHT.value, DEMO_FREIGHT.category)

  return (
    <div className="flex-1 relative overflow-hidden">

      {/* ── Mapa de fundo ─────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <ZpeMap pulse />
      </div>

      {/* ── Header com saudação ───────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5 pb-10"
        style={{ background: 'linear-gradient(180deg, #57A6C1ee 0%, #57A6C188 80%, transparent 100%)' }}
      >
        <div>
          <p className="text-white/80 text-xs font-medium">Boa tarde,</p>
          <h2 className="text-white text-xl font-extrabold leading-tight">Marcos Piauí 🌊</h2>
        </div>
        {/* Indicador de status online */}
        <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
          <div className="w-2 h-2 rounded-full bg-muvv-accent shadow-[0_0_8px_#1CC8C8]" />
        </div>
      </div>

      {/* ── Status pills ──────────────────────────────────────────── */}
      <div className="absolute top-[90px] left-5 flex gap-2">
        <span className="bg-muvv-accent text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-accent">
          ● Online
        </span>
        <span className="bg-muvv-prestige text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-prestige">
          ZPE Ativo
        </span>
      </div>

      {/* ── Card de frete ─────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/97 rounded-[20px] p-5 shadow-freight backdrop-blur-md border border-muvv-secondary/15">

        {/* Rota origem → destino */}
        <div className="flex items-center gap-3 mb-4">
          {/* Trilha visual */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-muvv-secondary" />
            <div
              className="w-0.5 h-6 rounded-sm"
              style={{ background: 'linear-gradient(#57A6C1, #1CC8C8)' }}
            />
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

        {/* ── Transparência financeira — Bruto / Taxa / Líquido ──────
            Esta é a regra central: o motorista vê SEMPRE os 3 valores. */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Valor bruto */}
          <div className="bg-muvv-primary rounded-xl p-2.5">
            <p className="text-muvv-muted text-[10px]">Bruto</p>
            <p className="text-muvv-dark text-base font-bold">R$ {DEMO_FREIGHT.value}</p>
          </div>

          {/* Taxa Muvv — cor âmbar/prestige para atenção */}
          <div className="bg-muvv-prestige-light rounded-xl p-2.5">
            <p className="text-muvv-prestige text-[10px]">Taxa ({(rate * 100).toFixed(0)}%)</p>
            <p className="text-muvv-prestige text-base font-bold">- R$ {formatBRL(fee)}</p>
          </div>

          {/* Valor LÍQUIDO — destaque Teal, borda para reforçar importância */}
          <div className="bg-muvv-accent-light rounded-xl p-2.5 border border-muvv-accent/20">
            <p className="text-muvv-accent text-[10px] font-semibold">LÍQUIDO</p>
            <p className="text-muvv-accent text-base font-extrabold">R$ {formatBRL(net)}</p>
          </div>
        </div>

        {/* Botão deslizante de aceite */}
        <SlideToAccept onAccept={() => onOrderDetail(DEMO_FREIGHT)} />
      </div>
    </div>
  )
}
