// ================================================
// MUVV ROTAS — Rastreamento do frete (Embarcador)
//
// Mostra: status em tempo real, dados do motorista,
// chat, ligar, mapa simulado
// ================================================

import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  Linking, ActivityIndicator, Alert
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { api } from '../../lib/api'

interface Frete {
  id:           string
  title:        string
  status:       string
  originAddress:string
  destAddress:  string
  totalPrice:   number
  driver?: {
    id:       string
    name:     string
    phone:    string
    avatarUrl:string | null
    driverProfile: { rating: number; vehicle?: { brand: string; model: string; plate: string } }
  }
}

const STATUS_LABEL: Record<string, { label: string; color: string; sub: string }> = {
  PENDING:    { label: 'Aguardando motorista',     color: '#f0a020', sub: 'Seu frete foi publicado' },
  MATCHED:    { label: 'Motorista a caminho',      color: '#4a90d0', sub: 'Aguardando início da coleta' },
  IN_TRANSIT: { label: 'Frete em andamento',       color: '#00d48a', sub: 'Sua carga está sendo entregue' },
  DELIVERED:  { label: 'Entregue com sucesso!',    color: '#00d48a', sub: 'Frete concluído' },
  CANCELLED:  { label: 'Frete cancelado',          color: '#e05555', sub: '' },
}

export default function RastreamentoEmbarcador() {
  const router = useRouter()
  const { id }   = useLocalSearchParams<{ id: string }>()
  const [frete,  setFrete]  = useState<Frete | null>(null)
  const [loading,setLoading]= useState(true)

  useEffect(() => {
    if (!id) return
    load()
    // Polling a cada 10s para atualizar status
    const timer = setInterval(load, 10000)
    return () => clearInterval(timer)
  }, [id])

  const load = async () => {
    try {
      const { data } = await api.get(`/fretes/${id}`)
      setFrete(data.frete)
    } catch {
      // silencia erros de polling
    } finally {
      setLoading(false)
    }
  }

  const ligar = () => {
    if (!frete?.driver?.phone) return
    Linking.openURL(`tel:${frete.driver.phone}`)
  }

  const cancelar = async () => {
    Alert.alert(
      'Cancelar frete',
      'Tem certeza que deseja cancelar este frete?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/fretes/${id}/cancelar`, { reason: 'Embarcador cancelou' })
              router.back()
            } catch {
              Alert.alert('Erro', 'Não foi possível cancelar.')
            }
          }
        }
      ]
    )
  }

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

  if (loading) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#00d48a" size="large" />
      </View>
    )
  }

  if (!frete) {
    return (
      <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#e05555' }}>Frete não encontrado.</Text>
      </View>
    )
  }

  const statusInfo = STATUS_LABEL[frete.status] ?? { label: frete.status, color: '#888', sub: '' }
  const isActive   = ['PENDING', 'MATCHED', 'IN_TRANSIT'].includes(frete.status)
  const isDelivered = frete.status === 'DELIVERED'

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backTxt}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{frete.title}</Text>
        <View style={[s.liveTag, { borderColor: statusInfo.color + '60' }]}>
          <View style={[s.liveDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[s.liveTxt, { color: statusInfo.color }]}>
            {isActive ? 'Ao vivo' : statusInfo.label}
          </Text>
        </View>
      </View>

      {/* Mapa simulado */}
      <View style={s.mapArea}>
        {/* Grade de ruas */}
        {[25, 45, 65, 80].map(t => (
          <View key={`h${t}`} style={[s.road, { top: `${t}%`, width: '100%', height: 1.5 }]} />
        ))}
        {[20, 40, 60, 78].map(l => (
          <View key={`v${l}`} style={[s.road, { left: `${l}%`, width: 1.5, height: '100%' }]} />
        ))}

        {/* Pinos */}
        <View style={[s.pin, s.pinOrigem, { top: '60%', left: '18%' }]} />
        <View style={[s.pin, s.pinDestino, { top: '22%', left: '55%' }]} />

        {/* Motorista */}
        {frete.driver && (
          <View style={[s.pinDriver, { top: '42%', left: '37%' }]}>
            <Text style={s.pinDriverTxt}>🚗</Text>
          </View>
        )}

        {/* ETA */}
        {frete.status === 'MATCHED' && (
          <View style={[s.etaBubble, { top: '35%', left: '42%' }]}>
            <Text style={s.etaTxt}>~8 min</Text>
          </View>
        )}
        {frete.status === 'IN_TRANSIT' && (
          <View style={[s.etaBubble, { top: '35%', left: '42%' }]}>
            <Text style={s.etaTxt}>~12 min</Text>
          </View>
        )}

        {/* Status overlay */}
        <View style={s.statusOverlay}>
          <Text style={[s.statusTitle, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          {statusInfo.sub ? <Text style={s.statusSub}>{statusInfo.sub}</Text> : null}
        </View>
      </View>

      {/* Dados do motorista */}
      {frete.driver ? (
        <View style={s.driverCard}>
          <View style={s.driverAv}>
            <Text style={s.driverAvTxt}>
              {frete.driver.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.driverName}>{frete.driver.name}</Text>
            <Text style={s.driverSub}>
              ★ {frete.driver.driverProfile?.rating?.toFixed(1) ?? '—'}
              {frete.driver.driverProfile?.vehicle
                ? ` · ${frete.driver.driverProfile.vehicle.brand} ${frete.driver.driverProfile.vehicle.model}`
                : ''
              }
              {frete.driver.driverProfile?.vehicle?.plate
                ? ` · ${frete.driver.driverProfile.vehicle.plate}`
                : ''
              }
            </Text>
          </View>
          <TouchableOpacity style={s.callBtn} onPress={ligar}>
            <Text style={s.callBtnTxt}>📞</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.waitingDriver}>
          <ActivityIndicator color="#f0a020" size="small" />
          <Text style={s.waitingDriverTxt}>Buscando motorista próximo...</Text>
        </View>
      )}

      {/* Ações */}
      <View style={s.actions}>
        {frete.driver && (
          <TouchableOpacity
            style={s.btnChat}
            onPress={() => router.push({ pathname: '/frete/chat', params: { freteId: id } })}
          >
            <Text style={s.btnChatTxt}>💬 Chat</Text>
          </TouchableOpacity>
        )}

        {isDelivered && (
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => router.replace({ pathname: '/frete/avaliar', params: { id } })}
          >
            <Text style={s.btnPrimaryTxt}>Avaliar motorista →</Text>
          </TouchableOpacity>
        )}

        {isActive && !isDelivered && (
          <TouchableOpacity style={s.btnCancel} onPress={cancelar}>
            <Text style={s.btnCancelTxt}>Cancelar frete</Text>
          </TouchableOpacity>
        )}
      </View>

    </View>
  )
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a1520' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 8,
                 padding: 16, paddingTop: 50, backgroundColor: '#0a1520' },
  backBtn:     { padding: 4 },
  backTxt:     { color: '#00d48a', fontSize: 14 },
  headerTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#e8f0f8' },
  liveTag:     { flexDirection: 'row', alignItems: 'center', gap: 5,
                 borderWidth: 1, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot:     { width: 6, height: 6, borderRadius: 3 },
  liveTxt:     { fontSize: 10, fontWeight: '500' },

  mapArea:     { height: 220, backgroundColor: '#0d2030', position: 'relative' },
  road:        { position: 'absolute', backgroundColor: '#1a3525' },
  pin:         { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  pinOrigem:   { backgroundColor: '#00d48a' },
  pinDestino:  { backgroundColor: '#f0a020' },
  pinDriver:   { position: 'absolute', width: 28, height: 28, borderRadius: 14,
                 backgroundColor: '#0a1520', borderWidth: 2, borderColor: '#00d48a',
                 alignItems: 'center', justifyContent: 'center' },
  pinDriverTxt:{ fontSize: 14 },
  etaBubble:   { position: 'absolute', backgroundColor: '#0a1520',
                 borderWidth: 1, borderColor: '#00d48a40',
                 borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  etaTxt:      { fontSize: 10, color: '#00d48a', fontWeight: '600' },
  statusOverlay:{ position: 'absolute', bottom: 10, left: 10,
                  backgroundColor: '#0a1520cc', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 6 },
  statusTitle: { fontSize: 12, fontWeight: '600' },
  statusSub:   { fontSize: 10, color: '#4a6070', marginTop: 1 },

  driverCard:  { flexDirection: 'row', alignItems: 'center', gap: 12,
                 backgroundColor: '#111e2e', margin: 12, borderRadius: 14,
                 borderWidth: 1, borderColor: '#1a2535', padding: 12 },
  driverAv:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a3050',
                 borderWidth: 2, borderColor: '#00d48a40',
                 alignItems: 'center', justifyContent: 'center' },
  driverAvTxt: { fontSize: 13, color: '#00d48a', fontWeight: '700' },
  driverName:  { fontSize: 13, color: '#e8f0f8', fontWeight: '600' },
  driverSub:   { fontSize: 11, color: '#4a6070', marginTop: 2 },
  callBtn:     { width: 36, height: 36, borderRadius: 18,
                 backgroundColor: '#00d48a18', borderWidth: 1, borderColor: '#00d48a40',
                 alignItems: 'center', justifyContent: 'center' },
  callBtnTxt:  { fontSize: 16 },

  waitingDriver:{ flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: '#111e2e', margin: 12, borderRadius: 14,
                  borderWidth: 1, borderColor: '#1a2535', padding: 14 },
  waitingDriverTxt:{ fontSize: 13, color: '#4a6070' },

  actions:     { padding: 12, gap: 10 },
  btnChat:     { backgroundColor: '#111e2e', borderRadius: 14, borderWidth: 1,
                 borderColor: '#1a2535', padding: 14, alignItems: 'center' },
  btnChatTxt:  { fontSize: 14, color: '#e8f0f8', fontWeight: '500' },
  btnPrimary:  { backgroundColor: '#00d48a', borderRadius: 14, padding: 14, alignItems: 'center' },
  btnPrimaryTxt:{ fontSize: 14, fontWeight: '700', color: '#042c14' },
  btnCancel:   { borderRadius: 14, borderWidth: 1, borderColor: '#e0555540', padding: 12, alignItems: 'center' },
  btnCancelTxt:{ fontSize: 13, color: '#e05555' },
})
