// ================================================
// MUVV ROTAS — Página Financeiro (Admin)
// ================================================

import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Evento {
  id:        string
  type:      string
  payload:   any
  createdAt: string
}

const EVENTO_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  DELIVERY_COMPLETED:    { label: 'Entrega concluída',    color: '#1D9E75', emoji: '✅' },
  DELIVERY_FAILED:       { label: 'Falha na entrega',     color: '#D85A30', emoji: '❌' },
  DUPLICATE_BLOCKED:     { label: 'Duplicidade bloqueada',color: '#BA7517', emoji: '⚠️' },
  INTEGRITY_ERROR:       { label: 'Erro de integridade',  color: '#993C1D', emoji: '🚨' },
  ADMIN_ADJUSTMENT:      { label: 'Ajuste admin',         color: '#7F77DD', emoji: '🔧' },
  ADMIN_REPROCESS:       { label: 'Reprocessamento',      color: '#378ADD', emoji: '🔄' },
}

export default function Financeiro() {
  const [eventos,  setEventos]  = useState<Evento[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [stats,    setStats]    = useState<any>(null)

  useEffect(() => { loadAll() }, [tipoFiltro])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [statsRes, eventosRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/eventos${tipoFiltro ? `?type=${tipoFiltro}` : ''}`)
      ])
      setStats(statsRes.data)
      setEventos(eventosRes.data.eventos)
    } catch {
      setEventos([])
    } finally {
      setLoading(false)
    }
  }

  const fmt     = (v: any) => `R$ ${Number(v ?? 0).toFixed(2).replace('.', ',')}`
  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Financeiro</h1>
      </div>

      {/* Resumo financeiro */}
      <div style={s.grid3}>
        <MetricCard
          label="Receita total (comissões)"
          value={fmt(stats?.totalRevenue)}
          sub="Desde o início"
          color="#1D9E75"
        />
        <MetricCard
          label="Receita da semana"
          value={fmt(stats?.weeklyRevenue)}
          sub="Últimos 7 dias"
          color="#BA7517"
        />
        <MetricCard
          label="Fretes pagos"
          value={String(stats?.totalFreights ?? 0)}
          sub="Total de operações"
          color="#378ADD"
        />
      </div>

      {/* Log de eventos financeiros */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <h2 style={s.cardTitle}>Log de eventos financeiros</h2>
          <select
            style={s.select}
            value={tipoFiltro}
            onChange={e => setTipoFiltro(e.target.value)}
          >
            <option value="">Todos os eventos</option>
            {Object.entries(EVENTO_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {loading && (
          <p style={{ color: '#8a9aaa', padding: '24px', textAlign: 'center' }}>Carregando...</p>
        )}

        {!loading && eventos.length === 0 && (
          <p style={{ color: '#8a9aaa', padding: '24px', textAlign: 'center' }}>
            Nenhum evento registrado ainda
          </p>
        )}

        {eventos.map(ev => {
          const cfg = EVENTO_CONFIG[ev.type] ?? { label: ev.type, color: '#888', emoji: '📋' }
          return (
            <div key={ev.id} style={s.eventoRow}>
              <div style={{ ...s.eventoEmoji }}>{cfg.emoji}</div>
              <div style={s.eventoBody}>
                <div style={s.eventoHeader}>
                  <span style={{ ...s.eventoBadge, color: cfg.color, background: cfg.color + '20' }}>
                    {cfg.label}
                  </span>
                  <span style={s.eventoDate}>{fmtDate(ev.createdAt)}</span>
                </div>
                <div style={s.eventoPayload}>
                  {ev.payload.freteId && (
                    <span style={s.payloadTag}>frete: {ev.payload.freteId.slice(0, 8)}...</span>
                  )}
                  {ev.payload.amount && (
                    <span style={s.payloadTag}>valor: R$ {Number(ev.payload.amount).toFixed(2)}</span>
                  )}
                  {ev.payload.newBalance && (
                    <span style={s.payloadTag}>saldo pós: R$ {Number(ev.payload.newBalance).toFixed(2)}</span>
                  )}
                  {ev.payload.error && (
                    <span style={{ ...s.payloadTag, color: '#e08080' }}>erro: {ev.payload.error}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ ...s.metricCard, borderTopColor: color }}>
      <p style={s.metricLabel}>{label}</p>
      <p style={{ ...s.metricValue, color }}>{value}</p>
      <p style={s.metricSub}>{sub}</p>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:       { padding: '24px 32px', maxWidth: 1200, margin: '0 auto' },
  pageHeader: { marginBottom: 24 },
  pageTitle:  { fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 },

  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },

  metricCard:  { background: '#1a2535', borderRadius: 14, padding: '20px', borderTop: '3px solid', border: '1px solid #2a3545' },
  metricLabel: { fontSize: 12, color: '#8a9aaa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 },
  metricValue: { fontSize: 28, fontWeight: 700, margin: '0 0 4px' },
  metricSub:   { fontSize: 12, color: '#6a7a8a', margin: 0 },

  card:       { background: '#1a2535', borderRadius: 16, padding: 24, border: '1px solid #2a3545' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle:  { fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 },
  select:     { background: '#0f1923', border: '1px solid #2a3545', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' },

  eventoRow:    { display: 'flex', gap: 14, padding: '12px 0', borderBottom: '0.5px solid #1a2535', alignItems: 'flex-start' },
  eventoEmoji:  { fontSize: 20, flexShrink: 0, marginTop: 2 },
  eventoBody:   { flex: 1 },
  eventoHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  eventoBadge:  { fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 99 },
  eventoDate:   { fontSize: 11, color: '#6a7a8a' },
  eventoPayload:{ display: 'flex', gap: 8, flexWrap: 'wrap' },
  payloadTag:   { fontSize: 11, background: '#0f1923', color: '#8a9aaa', padding: '2px 8px', borderRadius: 6 }
}
