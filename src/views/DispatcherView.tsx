// ─── views/DispatcherView.tsx — Painel Empresarial do Despachante ─────────────
//
// Seções:
//   1. Checklist de Segurança (Seguro, Monitoramento, Travas via Satélite, etc.)
//   2. Simulador BI — projeta ganhos anuais em R$ e € por frota
//   3. Tabela de 12 meses com gráfico de barras inline

import { useState, useMemo }  from 'react'
import { MuvvLogo }           from '@/components/MuvvLogo'
import { useFreight }         from '@/context/FreightContext'
import { projectBi, formatBRL, formatK, PLAN_TABLE } from '@/services/calculations'
import type { DispatcherChecklist, MuvvPlan } from '@/types'

// ── Checklist items ───────────────────────────────────────────────────────────
const CHECKLIST_ITEMS: { key: keyof DispatcherChecklist; label: string; desc: string; icon: string; critical: boolean }[] = [
  { key: 'insurance',      label: 'Seguro de Carga',           desc: 'Apólice ativa Cargo Gold',           icon: '🛡️', critical: true  },
  { key: 'monitoring',     label: 'Monitoramento 24h',         desc: 'Rastreamento GPS em tempo real',      icon: '📡', critical: true  },
  { key: 'satelliteLock',  label: 'Travas via Satélite',       desc: 'Bloqueio remoto ativo',               icon: '🔒', critical: true  },
  { key: 'documentation',  label: 'Documentação ZPE',          desc: 'NF, CRT, AWB e DU-E emitidos',        icon: '📄', critical: false },
  { key: 'loadSeal',       label: 'Lacre de Carga',            desc: 'Número do lacre registrado',          icon: '🔏', critical: false },
]

// ── Número formatado animado simples ─────────────────────────────────────────
function StatCard({ label, value, sub, color = '#1CC8C8', prefix = 'R$' }: {
  label: string; value: number; sub?: string; color?: string; prefix?: string
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-card flex flex-col">
      <p className="text-muvv-muted text-[10px] font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="font-extrabold leading-none" style={{ color, fontSize: 20 }}>
        {prefix} {formatBRL(value)}
      </p>
      {sub && <p className="text-muvv-muted text-[10px] mt-1">{sub}</p>}
    </div>
  )
}

// ── Gráfico de barras inline ──────────────────────────────────────────────────
function BiBarChart({ months }: { months: { label: string; netBrl: number; cumulativeNetBrl: number }[] }) {
  const maxNet = Math.max(...months.map(m => m.netBrl))
  return (
    <div className="flex gap-1 items-end h-20 pt-1">
      {months.map((m, i) => {
        const h = maxNet > 0 ? (m.netBrl / maxNet) * 64 : 4
        const isLast = i === 11
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: h,
                background: isLast ? 'linear-gradient(180deg, #DAA520, #C8952A)' : 'linear-gradient(180deg, #1CC8C8, #57A6C1)',
                transitionDelay: `${i * 40}ms`,
                minHeight: 4,
              }}
            />
            <span className={`text-[8px] font-semibold ${isLast ? 'text-muvv-prestige' : 'text-muvv-muted'}`}>
              {m.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function DispatcherView() {
  const { setProfile, eurRate } = useFreight()

  // ── Estado do Checklist ─────────────────────────────────────────────────────
  const [checklist, setChecklist] = useState<DispatcherChecklist>({
    insurance: false, monitoring: false, satelliteLock: false,
    documentation: false, loadSeal: false,
  })

  const toggleCheck = (key: keyof DispatcherChecklist) =>
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }))

  const criticalItems   = CHECKLIST_ITEMS.filter(i => i.critical)
  const criticalDone    = criticalItems.filter(i => checklist[i.key]).length
  const allCriticalDone = criticalDone === criticalItems.length
  const totalDone       = CHECKLIST_ITEMS.filter(i => checklist[i.key]).length

  // ── Estado do BI ─────────────────────────────────────────────────────────────
  const [biPlan,      setBiPlan]      = useState<MuvvPlan>('global')
  const [driverCount, setDriverCount] = useState(5)
  const [opProfile,   setOpProfile]   = useState<'fulltime' | 'freelancer'>('fulltime')
  const [avgKm,       setAvgKm]       = useState(50)
  const [frtPerDay,   setFrtPerDay]   = useState(3)
  const [expandTable, setExpandTable] = useState(false)

  const projection = useMemo(() => projectBi({
    driverCount, profile: opProfile, plan: biPlan,
    avgDistanceKm: avgKm, freightsPerDay: frtPerDay,
  }, eurRate), [driverCount, opProfile, biPlan, avgKm, frtPerDay, eurRate])

  const workDaysLabel = opProfile === 'fulltime' ? '22 dias/mês' : '10 dias/mês'

  // ── Seção ativa ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'checklist' | 'bi'>('checklist')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0"
           style={{ background: 'linear-gradient(135deg, #1A2B35 0%, #3D6B7D 100%)' }}>
        <div className="flex items-center justify-between px-5 py-3">
          <MuvvLogo variant="full" size={28} light />
          <button onClick={() => setProfile('hub')}
            className="text-white/60 text-xs border border-white/20 rounded-full px-3 py-1 cursor-pointer bg-transparent">
            ← Hub
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-0 px-5 pb-0">
          {(['checklist', 'bi'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-[13px] font-bold cursor-pointer border-none bg-transparent transition-all duration-200"
              style={{
                color:        tab === t ? '#1CC8C8' : 'rgba(255,255,255,0.5)',
                borderBottom: tab === t ? '3px solid #1CC8C8' : '3px solid transparent',
              }}>
              {t === 'checklist' ? '🔒 Segurança' : '📊 BI & Projeção'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo das abas ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ TAB CHECKLIST ═══════════════════════════════════════════ */}
        {tab === 'checklist' && (
          <div className="p-5 space-y-4">
            {/* Status header */}
            <div
              className="rounded-[18px] p-4 text-white"
              style={{
                background: allCriticalDone
                  ? 'linear-gradient(135deg, #1CC8C8, #57A6C1)'
                  : 'linear-gradient(135deg, #E07070, #C05050)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs font-medium">Status da Operação</p>
                  <p className="text-xl font-extrabold mt-0.5">
                    {allCriticalDone ? '✅ Pronto para operar' : '⚠️ Itens críticos pendentes'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black">{totalDone}/{CHECKLIST_ITEMS.length}</p>
                  <p className="text-white/70 text-[10px]">itens ok</p>
                </div>
              </div>
              {/* Barra de progresso */}
              <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500"
                     style={{ width: `${(totalDone / CHECKLIST_ITEMS.length) * 100}%` }} />
              </div>
            </div>

            {/* Itens críticos */}
            <div>
              <p className="text-muvv-muted text-[10px] font-bold uppercase tracking-wider mb-2">
                🔴 Itens Críticos (obrigatórios ZPE)
              </p>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.filter(i => i.critical).map(item => (
                  <ChecklistCard
                    key={item.key}
                    item={item}
                    checked={checklist[item.key]}
                    onToggle={() => toggleCheck(item.key)}
                  />
                ))}
              </div>
            </div>

            {/* Itens opcionais */}
            <div>
              <p className="text-muvv-muted text-[10px] font-bold uppercase tracking-wider mb-2">
                🟡 Documentação e Controles
              </p>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.filter(i => !i.critical).map(item => (
                  <ChecklistCard
                    key={item.key}
                    item={item}
                    checked={checklist[item.key]}
                    onToggle={() => toggleCheck(item.key)}
                  />
                ))}
              </div>
            </div>

            {/* Ação */}
            <button
              disabled={!allCriticalDone}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-base border-none cursor-pointer transition-all duration-200"
              style={{
                background: allCriticalDone
                  ? 'linear-gradient(135deg, #1CC8C8, #57A6C1)'
                  : '#C5D9E2',
                color: allCriticalDone ? 'white' : '#8AAEBB',
              }}
            >
              {allCriticalDone ? '🚛 Liberar Operação' : `Aguardando ${criticalItems.length - criticalDone} item(s) crítico(s)`}
            </button>
          </div>
        )}

        {/* ═══ TAB BI ══════════════════════════════════════════════════ */}
        {tab === 'bi' && (
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-muvv-dark text-lg font-extrabold">Projeção Anual</h2>
              <p className="text-muvv-muted text-xs">Simule ganhos da sua frota por 12 meses</p>
            </div>

            {/* Inputs do simulador */}
            <div className="bg-white rounded-[18px] p-4 shadow-card space-y-3">
              <p className="text-muvv-dark text-sm font-bold">Parâmetros da Frota</p>

              {/* Plano */}
              <div>
                <label className="text-muvv-muted text-[10px] uppercase tracking-wide font-semibold block mb-1">Plano</label>
                <div className="flex gap-2">
                  {(['go', 'pro', 'global'] as MuvvPlan[]).map(p => {
                    const t = PLAN_TABLE[p]
                    const active = biPlan === p
                    return (
                      <button key={p} onClick={() => setBiPlan(p)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${
                          active ? 'text-white border-transparent' : 'bg-muvv-primary border-muvv-border text-muvv-dark'
                        }`}
                        style={active ? { background: t.color, borderColor: t.color } : {}}>
                        {t.emoji} {t.shortLabel}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Perfil operacional */}
              <div>
                <label className="text-muvv-muted text-[10px] uppercase tracking-wide font-semibold block mb-1">
                  Perfil Operacional
                </label>
                <div className="flex gap-2">
                  {([
                    { id: 'fulltime',   label: '🏋️ Renda Principal', sub: '22 dias/mês' },
                    { id: 'freelancer', label: '⏱️ Freelancer',      sub: '10 dias/mês' },
                  ] as const).map(p => (
                    <button key={p.id} onClick={() => setOpProfile(p.id)}
                      className={`flex-1 py-2 px-2 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        opProfile === p.id
                          ? 'border-muvv-accent bg-muvv-accent-light text-muvv-accent'
                          : 'border-muvv-border bg-muvv-primary text-muvv-dark'
                      }`}>
                      <p className="text-xs font-bold">{p.label}</p>
                      <p className="text-[9px] text-muvv-muted">{p.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <BiSlider label="Nº de Motoristas" value={driverCount} min={1} max={50} step={1}
                onChange={setDriverCount} unit=" motoristas" color="#57A6C1" />
              <BiSlider label="Fretes por dia / motorista" value={frtPerDay} min={1} max={10} step={1}
                onChange={setFrtPerDay} unit=" fretes/dia" color="#1CC8C8" />
              <BiSlider label="Distância média por frete" value={avgKm} min={5} max={300} step={5}
                onChange={setAvgKm} unit=" km" color="#DAA520" />
            </div>

            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Ganho mensal (frota)" value={projection.monthlyNet}
                color="#1CC8C8" sub={`${driverCount} motoristas · ${workDaysLabel}`} />
              <StatCard label="Projeção 12 meses" value={projection.annualNet}
                color="#DAA520" sub="+3% crescimento/mês" />
              <StatCard label="Por motorista/ano" value={projection.revenuePerDriver}
                color="#57A6C1" sub="Médio líquido anual" />
              <StatCard label="Total em EUR/ano" value={projection.annualNetEur}
                color="#3D6B7D" prefix="€" sub={`Câmbio R$${eurRate.toFixed(2)}`} />
            </div>

            {/* Gráfico de barras */}
            <div className="bg-white rounded-[18px] p-4 shadow-card">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-muvv-dark text-sm font-bold">Evolução Mensal</p>
                  <p className="text-muvv-muted text-[10px]">Líquido da frota · crescimento 3%/mês</p>
                </div>
                <span className="text-muvv-accent text-xs font-bold bg-muvv-accent-light px-2 py-0.5 rounded-lg">
                  +3%/mês
                </span>
              </div>
              <BiBarChart months={projection.months} />
            </div>

            {/* Tabela detalhada — expansível */}
            <div className="bg-white rounded-[18px] overflow-hidden shadow-card">
              <button
                onClick={() => setExpandTable(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 cursor-pointer bg-transparent border-none"
              >
                <span className="text-muvv-dark text-sm font-bold">
                  📋 Tabela Mensal Detalhada
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#8AAEBB" strokeWidth="2.2" strokeLinecap="round"
                  style={{ transform: expandTable ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {expandTable && (
                <div className="border-t border-muvv-border">
                  {/* Cabeçalho */}
                  <div className="grid grid-cols-4 px-4 py-2 bg-muvv-primary">
                    {['Mês', 'Bruto', 'Líquido', 'Acumulado'].map(h => (
                      <span key={h} className="text-[9px] font-bold text-muvv-muted uppercase">{h}</span>
                    ))}
                  </div>
                  {projection.months.map((m, i) => (
                    <div key={i}
                      className="grid grid-cols-4 px-4 py-2 border-b border-muvv-border last:border-0"
                      style={{ background: i === 11 ? '#FFF8E7' : i % 2 === 0 ? 'white' : '#F8FBFC' }}
                    >
                      <span className="text-xs font-semibold text-muvv-dark">{m.label}</span>
                      <span className="text-xs text-muvv-muted">R${formatK(m.grossBrl)}</span>
                      <span className="text-xs font-bold" style={{ color: '#1CC8C8' }}>R${formatK(m.netBrl)}</span>
                      <span className="text-xs font-bold" style={{ color: i === 11 ? '#DAA520' : '#3D6B7D' }}>
                        R${formatK(m.cumulativeNetBrl)}
                      </span>
                    </div>
                  ))}
                  {/* Linha total */}
                  <div className="grid grid-cols-4 px-4 py-3"
                       style={{ background: 'linear-gradient(135deg, #EDFCFC, #F0FCFC)' }}>
                    <span className="text-xs font-bold text-muvv-accent">TOTAL</span>
                    <span className="text-xs font-bold text-muvv-dark">R${formatK(projection.annualGross)}</span>
                    <span className="text-xs font-bold text-muvv-accent">R${formatK(projection.annualNet)}</span>
                    <span className="text-xs font-bold text-muvv-prestige">€{formatK(projection.annualNetEur)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-componentes internos ──────────────────────────────────────────────────

function ChecklistCard({
  item, checked, onToggle,
}: {
  item: typeof CHECKLIST_ITEMS[0]; checked: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-2xl p-4 border-2 cursor-pointer transition-all duration-200 ${
        checked
          ? item.critical ? 'border-muvv-accent bg-muvv-accent-light' : 'border-muvv-secondary bg-blue-50/30'
          : 'border-muvv-border bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: checked ? (item.critical ? '#EDFCFC' : '#EBF5FF') : '#F5F9FB' }}
        >
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-muvv-dark text-sm font-bold">{item.label}</p>
            {item.critical && (
              <span className="text-[9px] font-bold bg-red-100 text-red-500 px-1.5 py-0.5 rounded">
                CRÍTICO
              </span>
            )}
          </div>
          <p className="text-muvv-muted text-xs mt-0.5">{item.desc}</p>
        </div>
        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
          checked ? 'bg-muvv-accent shadow-accent' : 'border-2 border-muvv-border bg-white'
        }`}>
          {checked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
      </div>
    </button>
  )
}

function BiSlider({ label, value, min, max, step, onChange, unit, color }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; unit: string; color: string
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-muvv-muted text-[10px] uppercase tracking-wide font-semibold">{label}</label>
        <span className="text-[11px] font-extrabold" style={{ color }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min)/(max - min))*100}%, #EBF2F5 ${((value - min)/(max - min))*100}%, #EBF2F5 100%)`,
        }}
      />
    </div>
  )
}
