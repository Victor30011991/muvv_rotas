// ================================================
// MUVV ROTAS — Página de Fretes (Admin)
// ================================================

import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Frete {
  id:             string
  title:          string
  status:         string
  vehicleType:    string
  totalPrice:     number
  platformFee:    number
  driverReceives: number
  originAddress:  string
  destAddress:    string
  createdAt:      string
  deliveredAt?:   string
  shipper: { name: string; phone: string }
  driver?:  { name: string; phone: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Aguardando',  color: '#BA7517' },
  MATCHED:    { label: 'Aceito',      color: '#185FA5' },
  IN_TRANSIT: { label: 'Em rota',     color: '#7F77DD' },
  DELIVERED:  { label: 'Entregue',    color: '#1D9E75' },
  CANCELLED:  { label: 'Cancelado',   color: '#993C1D' },
  DISPUTED:   { label: 'Em disputa',  color: '#D85A30' }
}

const VEHICLE_LABEL: Record<string, string> = {
  MOTO:            '🏍️ Moto',
  CARGA_LEVE:      '🚗 Carga Leve',
  VAN:             '🚐 Van',
  CAMINHAO_MEDIO:  '🚛 Caminhão Médio',
  CAMINHAO_GRANDE: '🚚 Caminhão Grande'
}

export default function Fretes() {
  const [fretes,   setFretes]   = useState<Frete[]>([])
  const [loading,  setLoading]  = useState(true)
  const [status,   setStatus]   = useState('')
  const [busca,    setBusca]    = useState('')
  const [selected, setSelected] = useState<Frete | null>(null)

  useEffect(() => { load() }, [status])

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      const { data } = await api.get(`/fretes?${params}`)
      setFretes(data.fretes)
    } catch {
      setFretes([])
    } finally {
      setLoading(false)
    }
  }

  const filtered = fretes.filter(f =>
    f.title.toLowerCase().includes(busca.toLowerCase()) ||
    f.shipper.name.toLowerCase().includes(busca.toLowerCase()) ||
    (f.driver?.name ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Fretes</h1>
          <p style={s.pageSub}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={s.filters}>
          <input
            style={s.search}
            placeholder="Buscar por título, cliente ou motorista..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select
            style={s.select}
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Título', 'Veículo', 'Embarcador', 'Motorista', 'Valor', 'Comissão', 'Status', 'Data'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#8a9aaa', padding: '32px' }}>
                Carregando...
              </td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ ...s.td, textAlign: 'center', color: '#8a9aaa', padding: '32px' }}>
                Nenhum frete encontrado
              </td></tr>
            )}
            {filtered.map(f => {
              const st = STATUS_CONFIG[f.status] ?? { label: f.status, color: '#888' }
              return (
                <tr
                  key={f.id}
                  style={{ ...s.tr, cursor: 'pointer' }}
                  onClick={() => setSelected(f)}
                >
                  <td style={s.td}>
                    <div style={{ fontWeight: 500, color: '#fff' }}>{f.title}</div>
                    <div style={{ fontSize: 11, color: '#8a9aaa', marginTop: 2 }}>
                      {f.originAddress.slice(0, 20)}... → {f.destAddress.slice(0, 20)}...
                    </div>
                  </td>
                  <td style={s.td}>{VEHICLE_LABEL[f.vehicleType] ?? f.vehicleType}</td>
                  <td style={s.td}>{f.shipper.name}</td>
                  <td style={s.td}>{f.driver?.name ?? '—'}</td>
                  <td style={{ ...s.td, fontWeight: 500, color: '#fff' }}>{fmt(f.totalPrice)}</td>
                  <td style={{ ...s.td, color: '#1D9E75' }}>{fmt(f.platformFee)}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, color: st.color, background: st.color + '20' }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ ...s.td, color: '#8a9aaa' }}>{fmtDate(f.createdAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de detalhe */}
      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <div>
                <div style={s.modalTitle}>{selected.title}</div>
                <span style={{
                  ...s.badge,
                  color: STATUS_CONFIG[selected.status]?.color,
                  background: (STATUS_CONFIG[selected.status]?.color ?? '#888') + '20'
                }}>
                  {STATUS_CONFIG[selected.status]?.label ?? selected.status}
                </span>
              </div>
              <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            <div style={s.modalGrid}>
              <div style={s.modalSection}>
                <div style={s.sectionTitle}>Rota</div>
                <Row label="Origem"  value={selected.originAddress} />
                <Row label="Destino" value={selected.destAddress} />
                <Row label="Veículo" value={VEHICLE_LABEL[selected.vehicleType] ?? selected.vehicleType} />
              </div>

              <div style={s.modalSection}>
                <div style={s.sectionTitle}>Partes</div>
                <Row label="Embarcador" value={`${selected.shipper.name} · ${selected.shipper.phone}`} />
                <Row label="Motorista"  value={selected.driver ? `${selected.driver.name} · ${selected.driver.phone}` : '—'} />
              </div>

              <div style={s.modalSection}>
                <div style={s.sectionTitle}>Financeiro</div>
                <Row label="Valor total"        value={fmt(selected.totalPrice)} />
                <Row label="Comissão Muvv (10%)" value={fmt(selected.platformFee)} highlight="#1D9E75" />
                <Row label="Motorista recebe"    value={fmt(selected.driverReceives)} />
              </div>

              <div style={s.modalSection}>
                <div style={s.sectionTitle}>Datas</div>
                <Row label="Criado em"   value={fmtDate(selected.createdAt)} />
                <Row label="Entregue em" value={selected.deliveredAt ? fmtDate(selected.deliveredAt) : '—'} />
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#4a5a6a', marginTop: 16 }}>
              ID: {selected.id}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid #1a2535' }}>
      <span style={{ fontSize: 12, color: '#8a9aaa' }}>{label}</span>
      <span style={{ fontSize: 12, color: highlight ?? '#fff', fontWeight: highlight ? 600 : 400 }}>{value}</span>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:       { padding: '24px 32px', maxWidth: 1300, margin: '0 auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  pageTitle:  { fontSize: 28, fontWeight: 700, color: '#fff', margin: 0 },
  pageSub:    { fontSize: 13, color: '#8a9aaa', marginTop: 4 },
  filters:    { display: 'flex', gap: 10, flexWrap: 'wrap' },
  search:     { background: '#1a2535', border: '1px solid #2a3545', borderRadius: 10, padding: '10px 16px', color: '#fff', fontSize: 14, outline: 'none', width: 300 },
  select:     { background: '#1a2535', border: '1px solid #2a3545', borderRadius: 10, padding: '10px 16px', color: '#fff', fontSize: 14, outline: 'none', cursor: 'pointer' },

  card:  { background: '#1a2535', borderRadius: 16, padding: 24, border: '1px solid #2a3545' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th:    { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#8a9aaa', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid #2a3545' },
  tr:    { borderBottom: '1px solid #1a2535', transition: 'background 0.1s' },
  td:    { padding: '12px', fontSize: 13, color: '#ccd' },
  badge: { padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal:   { background: '#0f1923', border: '1px solid #2a3545', borderRadius: 16, padding: 28, width: 580, maxHeight: '85vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 },
  closeBtn:    { background: 'none', border: 'none', color: '#8a9aaa', fontSize: 18, cursor: 'pointer', padding: '4px 8px' },
  modalGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  modalSection:{ background: '#1a2535', borderRadius: 12, padding: 16 },
  sectionTitle:{ fontSize: 11, fontWeight: 600, color: '#00a070', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }
}
