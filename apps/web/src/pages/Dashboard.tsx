// ================================================
// MUVV ROTAS — Dashboard Admin
// ================================================

import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Stats {
  totalFreights:     number
  activeFreights:    number
  totalDrivers:      number
  onlineDrivers:     number
  totalRevenue:      number
  weeklyRevenue:     number
  pendingFreights:   number
  deliveredToday:    number
}

interface RecentFreight {
  id:          string
  title:       string
  status:      string
  totalPrice:  number
  platformFee: number
  shipper:     { name: string }
  driver?:     { name: string }
  createdAt:   string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Aguardando', color: '#BA7517' },
  MATCHED:    { label: 'Aceito',     color: '#185FA5' },
  IN_TRANSIT: { label: 'Em rota',    color: '#7F77DD' },
  DELIVERED:  { label: 'Entregue',   color: '#0F6E56' },
  CANCELLED:  { label: 'Cancelado',  color: '#993C1D' }
}

export default function Dashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null)
  const [recent,  setRecent]  = useState<RecentFreight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/fretes?limit=10')
        ])
        setStats(statsRes.data)
        setRecent(recentRes.data.fretes)
      } catch {
        // Dados mock para desenvolvimento
        setStats({
          totalFreights:   42,
          activeFreights:  3,
          totalDrivers:    8,
          onlineDrivers:   5,
          totalRevenue:    1840,
          weeklyRevenue:   620,
          pendingFreights: 7,
          deliveredToday:  2
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`

  if (loading) {
    return (
      <div style={s.loading}>
        <p style={{ color: '#8a9aaa' }}>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={s.page}>

      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Dashboard</h1>
        <p style={s.pageSub}>Visão geral de Parnaíba — PI</p>
      </div>

      {/* Cards de métricas */}
      <div style={s.grid4}>
        <MetricCard label="Fretes totais"      value={String(stats?.totalFreights ?? 0)}  sub="Desde o início"       color="#378ADD" />
        <MetricCard label="Em andamento"       value={String(stats?.activeFreights ?? 0)} sub="Agora"                color="#7F77DD" />
        <MetricCard label="Motoristas ativos"  value={`${stats?.onlineDrivers ?? 0}/${stats?.totalDrivers ?? 0}`} sub="Online agora" color="#1D9E75" />
        <MetricCard label="Receita da semana"  value={fmt(stats?.weeklyRevenue ?? 0)}     sub="Comissão Muvv 10%"   color="#BA7517" />
      </div>

      {/* Segunda linha */}
      <div style={s.grid3}>
        <MetricCard label="Aguardando motorista" value={String(stats?.pendingFreights ?? 0)} sub="Fretes abertos"  color="#D85A30" />
        <MetricCard label="Entregues hoje"        value={String(stats?.deliveredToday ?? 0)} sub="Concluídos"      color="#0F6E56" />
        <MetricCard label="Receita total"         value={fmt(stats?.totalRevenue ?? 0)}      sub="Comissões acumuladas" color="#534AB7" />
      </div>

      {/* Tabela de fretes recentes */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Fretes recentes</h2>
        <table style={s.table}>
          <thead>
            <tr>
              {['Título', 'Embarcador', 'Motorista', 'Valor', 'Comissão Muvv', 'Status', 'Data'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#8a9aaa' }}>
                Nenhum frete ainda
              </td></tr>
            )}
            {recent.map(f => {
              const st = STATUS_LABEL[f.status] ?? { label: f.status, color: '#888' }
              return (
                <tr key={f.id} style={s.tr}>
                  <td style={s.td}>{f.title}</td>
                  <td style={s.td}>{f.shipper.name}</td>
                  <td style={s.td}>{f.driver?.name ?? '—'}</td>
                  <td style={s.td}>{fmt(f.totalPrice)}</td>
                  <td style={{ ...s.td, color: '#1D9E75', fontWeight: 500 }}>{fmt(f.platformFee)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, color: st.color, background: st.color + '20' }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: '#8a9aaa' }}>
                    {new Date(f.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string; sub: string; color: string
}) {
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
  loading:    { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' },
  pageHeader: { marginBottom: 24 },
  pageTitle:  { fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 },
  pageSub:    { fontSize: 13, color: '#8a9aaa', marginTop: 4 },

  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },

  metricCard: {
    background: '#1a2535', borderRadius: 14, padding: '20px 20px',
    borderTop: '3px solid', borderLeft: '1px solid #2a3545',
    borderRight: '1px solid #2a3545', borderBottom: '1px solid #2a3545'
  },
  metricLabel: { fontSize: 12, color: '#8a9aaa', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 },
  metricValue: { fontSize: 28, fontWeight: 700, margin: '0 0 4px' },
  metricSub:   { fontSize: 12, color: '#6a7a8a', margin: 0 },

  card:      { background: '#1a2535', borderRadius: 16, padding: 24, border: '1px solid #2a3545' },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 16px' },

  table: { width: '100%', borderCollapse: 'collapse' },
  th:    { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#8a9aaa', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid #2a3545' },
  tr:    { borderBottom: '1px solid #1a2535' },
  td:    { padding: '12px', fontSize: 13, color: '#ccd' },

  badge: { padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500 }
}
