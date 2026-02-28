// ─── WalletScreen — Carteira Bimodal R$ / € ──────────────────────────────────
// Dashboard financeiro com gráfico semanal e extrato detalhado.
// A carteira é bimodal: exibe saldo em Real (BRL) e Euro (para fretes ZPE).
// 🔧 ALTERE os dados em MOCK_* para testar diferentes cenários financeiros.

import { AnimCounter } from '@/components/AnimCounter'
import { WeeklyChart } from '@/components/WeeklyChart'
import type { Transaction } from '@/types'

// ── Dados mock — substituir por chamada de API em produção ──────────────────
// 🔧 ALTERE AQUI: saldos da carteira
const BALANCE_BRL  = 844.2
const BALANCE_EUR  = 153.2
const WEEKLY_TOTAL = 2390

const WEEKLY_DATA = [
  { value: 280 }, { value: 420 }, { value: 190 },
  { value: 560 }, { value: 340 }, { value: 480 }, { value: 120 },
]

// 🔧 ALTERE AQUI: transações do extrato
const TRANSACTIONS: Transaction[] = [
  { id: 1, label: 'Frete ZPE – Terminal A',    type: 'credit', amount: 289,   cat: 'ZPE',    time: 'Hoje, 14:30', euro: 52.4 },
  { id: 2, label: 'Taxa Muvv (15%)',            type: 'debit',  amount: -51,   cat: 'Taxa',   time: 'Hoje, 14:30'            },
  { id: 3, label: 'Frete Carga Leve – Teresina',type: 'credit', amount: 184,   cat: 'Leve',   time: 'Ontem'                  },
  { id: 4, label: 'Taxa Muvv (8%)',             type: 'debit',  amount: -16,   cat: 'Taxa',   time: 'Ontem'                  },
  { id: 5, label: 'Frete Pesado – Luís Correia',type: 'credit', amount: 440,   cat: 'Pesado', time: '28/05'                  },
  { id: 6, label: 'Taxa Muvv (12%)',            type: 'debit',  amount: -52.8, cat: 'Taxa',   time: '28/05'                  },
]

export function WalletScreen() {
  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Header com saldo total ────────────────────────────────── */}
      <div className="bg-gradient-wallet px-5 pt-7 pb-9 rounded-b-[28px]">
        <p className="text-white/70 text-sm mb-1">Carteira Muvv</p>

        {/* Saldo principal em BRL */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-white/70 text-xl">R$</span>
          <span className="text-white text-5xl font-black leading-none">
            <AnimCounter value={BALANCE_BRL} decimals={2} />
          </span>
        </div>

        {/* ── Carteira bimodal — Real e Euro lado a lado ─────────────
            O Euro é exclusivo para fretes ZPE com câmbio integrado. */}
        <div className="grid grid-cols-2 gap-3">
          {/* Real Brasileiro */}
          <div className="bg-white/12 rounded-2xl p-3 backdrop-blur-sm border border-white/20">
            <p className="text-white/60 text-[11px] mb-0.5">Real Brasileiro</p>
            <p className="text-white text-[17px] font-bold">
              R$ <AnimCounter value={BALANCE_BRL} decimals={2} />
            </p>
          </div>

          {/* Euro — ZPE */}
          <div className="rounded-2xl p-3 backdrop-blur-sm border border-muvv-prestige/35"
               style={{ background: 'rgba(218,165,32,0.2)' }}>
            <p className="text-muvv-prestige text-[11px] font-semibold mb-0.5">Euro · ZPE</p>
            <p className="text-yellow-300 text-[17px] font-bold">
              € <AnimCounter value={BALANCE_EUR} decimals={2} />
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* ── Gráfico semanal ───────────────────────────────────────── */}
        <div className="bg-white rounded-[18px] p-5 shadow-card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-muvv-muted text-xs">Esta semana</p>
              <p className="text-muvv-dark text-xl font-black">R$ {WEEKLY_TOTAL.toLocaleString('pt-BR')},00</p>
            </div>
            <span className="bg-muvv-accent-light text-muvv-accent text-xs font-bold px-3 py-1 rounded-xl">
              +18% ↑
            </span>
          </div>
          <WeeklyChart data={WEEKLY_DATA} />
        </div>

        {/* ── Extrato detalhado ─────────────────────────────────────── */}
        <h3 className="text-muvv-dark text-[15px] font-bold">Extrato Detalhado</h3>

        <div className="flex flex-col gap-2">
          {TRANSACTIONS.map(tx => (
            <div
              key={tx.id}
              className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-card-sm"
            >
              {/* Ícone de direção */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base ${
                  tx.type === 'credit' ? 'bg-muvv-accent-light' : 'bg-red-50'
                }`}
              >
                {tx.type === 'credit' ? '↑' : '↓'}
              </div>

              {/* Descrição */}
              <div className="flex-1 min-w-0">
                <p className="text-muvv-dark text-[13px] font-semibold truncate">{tx.label}</p>
                <p className="text-muvv-muted text-[11px]">{tx.time}</p>
              </div>

              {/* Valor */}
              <div className="text-right flex-shrink-0">
                <p
                  className={`text-[15px] font-bold ${
                    tx.type === 'credit' ? 'text-muvv-accent' : 'text-red-400'
                  }`}
                >
                  {tx.type === 'credit' ? '+' : ''}R$ {tx.amount}
                </p>
                {/* Equivalente em Euro — só aparece em fretes ZPE */}
                {tx.euro && (
                  <p className="text-muvv-prestige text-[10px]">≈ €{tx.euro}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
