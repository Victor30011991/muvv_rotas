// ================================================
// MUVV ROTAS — Página de Motoristas (Admin)
// ================================================

import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Driver {
  id:     string
  name:   string
  email:  string
  phone:  string
  status: string
  driverProfile?: {
    rating:      number
    totalTrips:  number
    isAvailable: boolean
    loyaltyBadge?: string
    vehicle?: { type: string; brand: string; model: string; plate: string }
  }
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    '#1D9E75',
  PENDING:   '#BA7517',
  SUSPENDED: '#993C1D',
  BLOCKED:   '#D85A30'
}

export default function Motoristas() {
  const [drivers,  setDrivers]  = useState<Driver[]>([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await api.get('/admin/motoristas')
        setDrivers(res.data.drivers)
      } catch {
        // Mock para desenvolvimento
        setDrivers([
          {
            id: '1', name: 'Carlos Motorista', email: 'carlos@teste.com',
            phone: '86988881111', status: 'ACTIVE',
            driverProfile: {
              rating: 4.8, totalTrips: 12, isAvailable: true,
              loyaltyBadge: 'bronze',
              vehicle: { type: 'CARGA_LEVE', brand: 'Fiat', model: 'Fiorino', plate: 'ABC1D23' }
            }
          }
        ])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  )

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Motoristas</h1>
        <input
          style={s.search}
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Nome', 'Contato', 'Veículo', 'Fretes', 'Avaliação', 'Status', 'Disponível'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center', color: '#8a9aaa' }}>
                Carregando...
              </td></tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} style={s.tr}>
                <td style={s.td}>
                  <div style={{ fontWeight: 500, color: '#fff' }}>{d.name}</div>
                  {d.driverProfile?.loyaltyBadge && (
                    <div style={{ fontSize: 11, color: '#8a9aaa' }}>
                      {d.driverProfile.loyaltyBadge === 'gold' ? '🥇' : d.driverProfile.loyaltyBadge === 'silver' ? '🥈' : '🥉'} {d.driverProfile.loyaltyBadge}
                    </div>
                  )}
                </td>
                <td style={s.td}>
                  <div>{d.phone}</div>
                  <div style={{ fontSize: 11, color: '#8a9aaa' }}>{d.email}</div>
                </td>
                <td style={s.td}>
                  {d.driverProfile?.vehicle
                    ? `${d.driverProfile.vehicle.brand} ${d.driverProfile.vehicle.model} — ${d.driverProfile.vehicle.plate}`
                    : '—'
                  }
                </td>
                <td style={s.td}>{d.driverProfile?.totalTrips ?? 0}</td>
                <td style={s.td}>
                  <span style={{ color: '#ffd700' }}>★</span> {(d.driverProfile?.rating ?? 0).toFixed(1)}
                </td>
                <td style={s.td}>
                  <span style={{ ...s.badge, color: STATUS_COLOR[d.status], background: STATUS_COLOR[d.status] + '20' }}>
                    {d.status}
                  </span>
                </td>
                <td style={s.td}>
                  <span style={{ color: d.driverProfile?.isAvailable ? '#00e0a0' : '#8a9aaa', fontSize: 20 }}>
                    {d.driverProfile?.isAvailable ? '●' : '○'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:       { padding: '24px 32px', maxWidth: 1200, margin: '0 auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle:  { fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 },
  search:     {
    background: '#1a2535', border: '1px solid #2a3545',
    borderRadius: 10, padding: '10px 16px', color: '#fff',
    fontSize: 14, outline: 'none', width: 280
  },
  card:  { background: '#1a2535', borderRadius: 16, padding: 24, border: '1px solid #2a3545' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th:    { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#8a9aaa', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid #2a3545' },
  tr:    { borderBottom: '1px solid #1a2535' },
  td:    { padding: '12px', fontSize: 13, color: '#ccd' },
  badge: { padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500 }
}
