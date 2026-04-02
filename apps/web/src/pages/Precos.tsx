// ================================================
// MUVV ROTAS — Página de Preços (Admin)
// Com edição inline de cada categoria
// ================================================

import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface TabelaItem {
  tipo:       string
  nome:       string
  emoji:      string
  baseRate:   number
  ratePerKm:  number
  minPrice:   number
  helperRate: number
}

interface Simulacao {
  distanceKm:     number
  basePrice:      number
  helperPrice:    number
  totalPrice:     number
  platformFee:    number
  driverReceives: number
  breakdown:      { faixas: { label: string; km: number; valor: number }[] }
}

export default function Precos() {
  const [tabela,     setTabela]     = useState<TabelaItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [editando,   setEditando]   = useState<string | null>(null)
  const [editVals,   setEditVals]   = useState<Partial<TabelaItem>>({})
  const [saving,     setSaving]     = useState(false)
  const [simulacao,  setSimulacao]  = useState<Simulacao | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [vehicleSim, setVehicleSim] = useState('CARGA_LEVE')
  const [helperSim,  setHelperSim]  = useState(false)
  const [distSim,    setDistSim]    = useState('15')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const { data } = await api.get('/precos')
      setTabela(data.tabela)
    } catch {}
    finally { setLoading(false) }
  }

  const startEdit = (item: TabelaItem) => {
    setEditando(item.tipo)
    setEditVals({
      baseRate:   item.baseRate,
      ratePerKm:  item.ratePerKm,
      minPrice:   item.minPrice,
      helperRate: item.helperRate
    })
  }

  const cancelEdit = () => { setEditando(null); setEditVals({}) }

  const saveEdit = async (tipo: string) => {
    setSaving(true)
    try {
      await api.put(`/precos/${tipo}`, editVals)
      await load()
      setEditando(null)
      setEditVals({})
    } catch {
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const simular = async () => {
    setSimLoading(true)
    try {
      const km = parseFloat(distSim) || 15
      const { data } = await api.post('/precos/calcular', {
        vehicleType:    vehicleSim,
        helperIncluded: helperSim,
        originLat:  -2.9051,
        originLng:  -41.7752,
        destLat:    -2.9051 + (km / 111),
        destLng:    -41.7752
      })
      setSimulacao(data)
    } catch {} finally { setSimLoading(false) }
  }

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Tabela de Preços</h1>
        <p style={s.pageSub}>
          Preços reais de Parnaíba — PI · Comissão Muvv: 13% · Modelo em faixas de km
        </p>
      </div>

      {/* Tabela editável */}
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Veículo','Taxa base','Por km','Mínimo','Ajudante',''].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ ...s.td, textAlign:'center', color:'#8a9aaa', padding:24 }}>
                Carregando...
              </td></tr>
            )}
            {tabela.map(item => (
              <tr key={item.tipo} style={s.tr}>
                <td style={s.td}>
                  <span style={{ fontSize:15, fontWeight:500, color:'#fff' }}>
                    {item.emoji} {item.nome}
                  </span>
                </td>

                {editando === item.tipo ? (
                  <>
                    <td style={s.td}><input style={s.editInput} type="number" value={editVals.baseRate ?? ''}
                      onChange={e => setEditVals(v => ({ ...v, baseRate: parseFloat(e.target.value) }))} /></td>
                    <td style={s.td}><input style={s.editInput} type="number" value={editVals.ratePerKm ?? ''}
                      onChange={e => setEditVals(v => ({ ...v, ratePerKm: parseFloat(e.target.value) }))} /></td>
                    <td style={s.td}><input style={s.editInput} type="number" value={editVals.minPrice ?? ''}
                      onChange={e => setEditVals(v => ({ ...v, minPrice: parseFloat(e.target.value) }))} /></td>
                    <td style={s.td}><input style={s.editInput} type="number" value={editVals.helperRate ?? ''}
                      onChange={e => setEditVals(v => ({ ...v, helperRate: parseFloat(e.target.value) }))} /></td>
                    <td style={s.td}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button style={s.btnSave} onClick={() => saveEdit(item.tipo)} disabled={saving}>
                          {saving ? '...' : 'Salvar'}
                        </button>
                        <button style={s.btnCancel} onClick={cancelEdit}>Cancelar</button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={s.td}>{fmt(item.baseRate)}</td>
                    <td style={s.td}>{fmt(item.ratePerKm)}/km</td>
                    <td style={s.td}>{fmt(item.minPrice)}</td>
                    <td style={s.td}>{item.helperRate > 0 ? fmt(item.helperRate) : '—'}</td>
                    <td style={s.td}>
                      <button style={s.btnEdit} onClick={() => startEdit(item)}>Editar</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info faixas */}
      <div style={{ ...s.card, marginBottom:24 }}>
        <div style={s.cardTitle}>Modelo de faixas de km (v2)</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {[
            { faixa:'0 – 20 km',    taxa:'100% do valor/km', cor:'#1D9E75' },
            { faixa:'20 – 100 km',  taxa:'70% do valor/km',  cor:'#378ADD' },
            { faixa:'100 – 300 km', taxa:'45% do valor/km',  cor:'#BA7517' },
            { faixa:'300 km +',     taxa:'30% do valor/km',  cor:'#D85A30' },
          ].map(f => (
            <div key={f.faixa} style={{ background:'#1a2535', borderRadius:10, padding:'10px 12px', borderLeft:`3px solid ${f.cor}` }}>
              <div style={{ fontSize:11, color:'#8a9aaa', marginBottom:3 }}>{f.faixa}</div>
              <div style={{ fontSize:13, fontWeight:500, color:f.cor }}>{f.taxa}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculadora */}
      <div style={s.card}>
        <div style={s.cardTitle}>Calculadora de frete</div>
        <p style={s.cardSub}>Simule com o novo modelo de faixas</p>
        <div style={s.calcGrid}>
          <div style={s.field}>
            <label style={s.label}>Veículo</label>
            <select style={s.select} value={vehicleSim} onChange={e => setVehicleSim(e.target.value)}>
              <option value="MOTO">🏍️ Moto</option>
              <option value="CARGA_LEVE">🚗 Carga Leve</option>
              <option value="VAN">🚐 Van</option>
              <option value="CAMINHAO_MEDIO">🚛 Caminhão Médio</option>
              <option value="CAMINHAO_GRANDE">🚚 Caminhão Grande</option>
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Distância (km)</label>
            <input style={s.select} type="number" min="1" max="1000" value={distSim}
              onChange={e => setDistSim(e.target.value)} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Ajudante</label>
            <div style={{ display:'flex', gap:8 }}>
              {['Sim','Não'].map(opt => (
                <button key={opt}
                  style={{ ...s.toggleBtn, ...(((opt==='Sim')===helperSim) ? s.toggleBtnOn : {}) }}
                  onClick={() => setHelperSim(opt === 'Sim')}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button style={{ ...s.calcBtn, ...(simLoading ? { opacity:0.6 } : {}) }}
          onClick={simular} disabled={simLoading}>
          {simLoading ? 'Calculando...' : 'Calcular'}
        </button>

        {simulacao && (
          <div style={s.resultado}>
            <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'0.5px solid #1a2535', marginBottom:8 }}>
              <span style={{ fontSize:13, color:'#8a9aaa' }}>Distância</span>
              <span style={{ fontSize:13, color:'#fff' }}>{simulacao.distanceKm.toFixed(1)} km</span>
            </div>
            {simulacao.breakdown?.faixas?.map((f, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', fontSize:12 }}>
                <span style={{ color:'#6a7a8a' }}>{f.label}</span>
                <span style={{ color:'#ccc' }}>R$ {f.valor.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop:'1px solid #1a2535', marginTop:8, paddingTop:10, display:'grid', gap:6 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:14, color:'#fff', fontWeight:500 }}>Total do frete</span>
                <span style={{ fontSize:20, fontWeight:700, color:'#00e0a0' }}>{fmt(simulacao.totalPrice)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'#8a9aaa' }}>Comissão Muvv (13%)</span>
                <span style={{ color:'#1D9E75' }}>{fmt(simulacao.platformFee)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'#8a9aaa' }}>Motorista recebe</span>
                <span style={{ color:'#00e0a0' }}>{fmt(simulacao.driverReceives)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page:       { padding:'24px 32px', maxWidth:1200, margin:'0 auto' },
  pageHeader: { marginBottom:24 },
  pageTitle:  { fontSize:28, fontWeight:700, color:'#fff', margin:0 },
  pageSub:    { fontSize:13, color:'#8a9aaa', marginTop:4 },
  card:       { background:'#1a2535', borderRadius:16, padding:24, border:'1px solid #2a3545', marginBottom:16 },
  cardTitle:  { fontSize:14, fontWeight:600, color:'#fff', margin:'0 0 6px' },
  cardSub:    { fontSize:13, color:'#8a9aaa', margin:'0 0 20px' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { textAlign:'left', padding:'10px 12px', fontSize:11, fontWeight:600, color:'#8a9aaa', textTransform:'uppercase', letterSpacing:0.8, borderBottom:'1px solid #2a3545' },
  tr:         { borderBottom:'1px solid #1a2535' },
  td:         { padding:'12px', fontSize:14, color:'#ccd' },
  editInput:  { background:'#0f1923', border:'1px solid #00a070', borderRadius:6, padding:'6px 8px', fontSize:13, color:'#fff', outline:'none', width:80 },
  btnEdit:    { fontSize:11, color:'#4a90d0', background:'none', border:'1px solid #4a90d040', borderRadius:6, padding:'4px 10px', cursor:'pointer' },
  btnSave:    { fontSize:11, color:'#042c14', background:'#00a070', border:'none', borderRadius:6, padding:'5px 12px', cursor:'pointer', fontWeight:600 },
  btnCancel:  { fontSize:11, color:'#8a9aaa', background:'none', border:'1px solid #2a3545', borderRadius:6, padding:'5px 10px', cursor:'pointer' },
  calcGrid:   { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 },
  field:      { display:'flex', flexDirection:'column', gap:8 },
  label:      { fontSize:12, fontWeight:500, color:'#8a9aaa', textTransform:'uppercase', letterSpacing:'0.08em' },
  select:     { background:'#0f1923', border:'1px solid #2a3545', borderRadius:10, padding:'10px 14px', fontSize:14, color:'#fff', outline:'none', cursor:'pointer' },
  toggleBtn:  { flex:1, background:'#0f1923', border:'1px solid #2a3545', borderRadius:8, padding:'10px', color:'#8a9aaa', cursor:'pointer', fontSize:13 },
  toggleBtnOn:{ background:'#0d2a20', borderColor:'#00a070', color:'#00e0a0' },
  calcBtn:    { background:'#00a070', border:'none', borderRadius:10, padding:'12px 28px', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' },
  resultado:  { marginTop:20, background:'#0f1923', borderRadius:12, padding:16 },
}
