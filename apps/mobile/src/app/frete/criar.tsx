// ================================================
// MUVV ROTAS — Criar Frete (Embarcador)
//
// Fluxo em 4 passos:
//   1. Endereços (origem + destino + descrição)
//   2. Veículo + ajudante + quando
//   3. Confirmação de preço
//   4. Aguardando motorista
// ================================================

import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../lib/api'

// ── Tipos ──────────────────────────────────────
type VehicleType = 'MOTO' | 'CARGA_LEVE' | 'VAN' | 'CAMINHAO_MEDIO' | 'CAMINHAO_GRANDE'

interface Pricing {
  distanceKm:     number
  basePrice:      number
  helperPrice:    number
  totalPrice:     number
  platformFee:    number
  driverReceives: number
}

// ── Constantes ─────────────────────────────────
const VEHICLES: { type: VehicleType; emoji: string; label: string }[] = [
  { type: 'MOTO',            emoji: '🏍️', label: 'Moto'          },
  { type: 'CARGA_LEVE',      emoji: '🚗', label: 'Saveiro'       },
  { type: 'VAN',             emoji: '🚐', label: 'Van'           },
  { type: 'CAMINHAO_MEDIO',  emoji: '🚛', label: 'Cam. Médio'    },
  { type: 'CAMINHAO_GRANDE', emoji: '🚚', label: 'Cam. Grande'   },
]

// Coordenadas fixas de Parnaíba-PI para simulação de distância
// Em produção: usar Google Maps Places API
const PARNAIBA_COORDS = { lat: -2.9051, lng: -41.7752 }

export default function CriarFrete() {
  const router = useRouter()

  // ── Estado do formulário ──────────────────────
  const [step,            setStep]            = useState(1)
  const [loading,         setLoading]         = useState(false)
  const [pricing,         setPricing]         = useState<Pricing | null>(null)
  const [freteId,         setFreteId]         = useState<string | null>(null)

  // Passo 1
  const [originAddress,   setOriginAddress]   = useState('')
  const [destAddress,     setDestAddress]     = useState('')
  const [description,     setDescription]     = useState('')

  // Passo 2
  const [vehicleType,     setVehicleType]     = useState<VehicleType>('CARGA_LEVE')
  const [helperIncluded,  setHelperIncluded]  = useState(false)
  const [agendado,        setAgendado]        = useState(false)

  // ── Helpers ───────────────────────────────────
  const fmt = (v: number) =>
    `R$ ${Number(v).toFixed(2).replace('.', ',')}`

  // Simula distância baseada no tamanho dos endereços
  // Em produção: Google Maps Distance Matrix
  const estimarDistancia = () => {
    const base = Math.abs(originAddress.length - destAddress.length)
    return Math.max(2, Math.min(50, base * 0.8 + 3))
  }

  // ── Passo 1 → 2 ──────────────────────────────
  const handleStep1 = () => {
    if (!originAddress.trim() || !destAddress.trim()) {
      Alert.alert('Atenção', 'Preencha o endereço de coleta e entrega.')
      return
    }
    setStep(2)
  }

  // ── Passo 2 → 3 (calcular preço) ──────────────
  const handleCalcular = async () => {
    setLoading(true)
    try {
      const distKm = estimarDistancia()
      const { data } = await api.post('/precos/calcular', {
        vehicleType,
        helperIncluded,
        originLat:  PARNAIBA_COORDS.lat,
        originLng:  PARNAIBA_COORDS.lng,
        destLat:    PARNAIBA_COORDS.lat + (distKm / 111),
        destLng:    PARNAIBA_COORDS.lng,
      })
      setPricing(data)
      setStep(3)
    } catch {
      Alert.alert('Erro', 'Não foi possível calcular o preço. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Passo 3 → 4 (criar frete) ─────────────────
  const handleCriarFrete = async () => {
    if (!pricing) return
    setLoading(true)
    try {
      const distKm = estimarDistancia()
      const { data } = await api.post('/fretes', {
        title:           description || `Frete — ${destAddress.slice(0, 30)}`,
        description,
        vehicleType,
        originAddress,
        originLat:       PARNAIBA_COORDS.lat,
        originLng:       PARNAIBA_COORDS.lng,
        originReference: '',
        destAddress,
        destLat:         PARNAIBA_COORDS.lat + (distKm / 111),
        destLng:         PARNAIBA_COORDS.lng,
        destReference:   '',
        helperIncluded,
        paymentMethod:   'PIX',
      })
      setFreteId(data.frete.id)
      setStep(4)
    } catch (err: any) {
      Alert.alert('Erro', err.response?.data?.error ?? 'Erro ao criar frete.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────
  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        {step > 1 && step < 4 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={s.backBtn}>
            <Text style={s.backTxt}>← Voltar</Text>
          </TouchableOpacity>
        )}
        {step === 4 ? null : (
          <TouchableOpacity onPress={() => router.back()} style={[s.backBtn, { marginLeft: 'auto' }]}>
            <Text style={s.backTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Indicador de passos */}
      {step < 4 && (
        <View style={s.steps}>
          {[1, 2, 3].map(n => (
            <View key={n} style={[s.stepBar, step >= n && s.stepBarActive]} />
          ))}
        </View>
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ═══ PASSO 1: ENDEREÇOS ═══ */}
        {step === 1 && (
          <View>
            <Text style={s.stepTitle}>Onde buscar e entregar?</Text>
            <Text style={s.stepSub}>Passo 1 de 3</Text>

            <Text style={s.label}>Endereço de coleta</Text>
            <View style={s.inputRow}>
              <View style={[s.dot, { backgroundColor: '#00d48a' }]} />
              <TextInput
                style={s.input}
                placeholder="Rua, número, bairro..."
                placeholderTextColor="#3a5570"
                value={originAddress}
                onChangeText={setOriginAddress}
              />
            </View>

            <Text style={s.label}>Endereço de entrega</Text>
            <View style={s.inputRow}>
              <View style={[s.dot, { backgroundColor: '#f0a020' }]} />
              <TextInput
                style={s.input}
                placeholder="Rua, número, bairro..."
                placeholderTextColor="#3a5570"
                value={destAddress}
                onChangeText={setDestAddress}
              />
            </View>

            <Text style={s.label}>O que será transportado?</Text>
            <TextInput
              style={[s.input, { paddingLeft: 14, height: 80, textAlignVertical: 'top' }]}
              placeholder="Ex: Caixas de cerâmica, 8 volumes..."
              placeholderTextColor="#3a5570"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <TouchableOpacity style={s.btnPrimary} onPress={handleStep1}>
              <Text style={s.btnPrimaryTxt}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ PASSO 2: VEÍCULO ═══ */}
        {step === 2 && (
          <View>
            <Text style={s.stepTitle}>Qual veículo você precisa?</Text>
            <Text style={s.stepSub}>Passo 2 de 3</Text>

            <Text style={s.label}>Tipo de veículo</Text>
            <View style={s.vehicleGrid}>
              {VEHICLES.map(v => (
                <TouchableOpacity
                  key={v.type}
                  style={[s.vehicleCard, vehicleType === v.type && s.vehicleCardSel]}
                  onPress={() => setVehicleType(v.type)}
                >
                  <Text style={s.vehicleEmoji}>{v.emoji}</Text>
                  <Text style={[s.vehicleLbl, vehicleType === v.type && s.vehicleLblSel]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.helperRow}>
              <View>
                <Text style={s.helperTxt}>Incluir ajudante</Text>
                <Text style={s.helperSub}>+R$ 60,00 no valor</Text>
              </View>
              <TouchableOpacity
                style={[s.toggle, helperIncluded && s.toggleOn]}
                onPress={() => setHelperIncluded(!helperIncluded)}
              >
                <View style={[s.toggleThumb, helperIncluded && s.toggleThumbOn]} />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Quando?</Text>
            <View style={s.whenRow}>
              <TouchableOpacity
                style={[s.whenBtn, !agendado && s.whenBtnSel]}
                onPress={() => setAgendado(false)}
              >
                <Text style={[s.whenTxt, !agendado && s.whenTxtSel]}>Agora</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.whenBtn, agendado && s.whenBtnSel]}
                onPress={() => setAgendado(true)}
              >
                <Text style={[s.whenTxt, agendado && s.whenTxtSel]}>Agendar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, loading && s.btnDisabled]}
              onPress={handleCalcular}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#042c14" />
                : <Text style={s.btnPrimaryTxt}>Ver preço</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ PASSO 3: CONFIRMAÇÃO DE PREÇO ═══ */}
        {step === 3 && pricing && (
          <View>
            <Text style={s.stepTitle}>Confirmar pedido</Text>
            <Text style={s.stepSub}>Passo 3 de 3</Text>

            {/* Rota resumo */}
            <View style={s.routeCard}>
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#00d48a' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.routeAddr} numberOfLines={1}>{originAddress}</Text>
                  <Text style={s.routeLbl}>Coleta</Text>
                </View>
              </View>
              <View style={s.routeLine} />
              <View style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: '#f0a020' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.routeAddr} numberOfLines={1}>{destAddress}</Text>
                  <Text style={s.routeLbl}>Entrega</Text>
                </View>
              </View>
            </View>

            {/* Preço detalhado */}
            <View style={s.priceCard}>
              <View style={s.priceRow}>
                <Text style={s.priceKey}>Distância</Text>
                <Text style={s.priceVal}>{pricing.distanceKm.toFixed(1)} km</Text>
              </View>
              <View style={s.priceRow}>
                <Text style={s.priceKey}>Veículo</Text>
                <Text style={s.priceVal}>
                  {VEHICLES.find(v => v.type === vehicleType)?.emoji}{' '}
                  {VEHICLES.find(v => v.type === vehicleType)?.label}
                </Text>
              </View>
              <View style={s.priceRow}>
                <Text style={s.priceKey}>Frete base</Text>
                <Text style={s.priceVal}>{fmt(pricing.basePrice)}</Text>
              </View>
              {helperIncluded && (
                <View style={s.priceRow}>
                  <Text style={s.priceKey}>Ajudante</Text>
                  <Text style={s.priceVal}>{fmt(pricing.helperPrice)}</Text>
                </View>
              )}
              <View style={[s.priceRow, s.priceRowTotal]}>
                <Text style={s.priceTotalKey}>Total</Text>
                <Text style={s.priceTotalVal}>{fmt(pricing.totalPrice)}</Text>
              </View>
            </View>

            <Text style={s.priceNote}>
              Preço fixo — sem surpresas na entrega
            </Text>

            {/* Pagamento */}
            <Text style={s.label}>Pagamento</Text>
            <View style={s.payRow}>
              <View style={[s.payBtn, s.payBtnSel]}>
                <Text style={s.payTxtSel}>PIX</Text>
              </View>
              <View style={s.payBtn}>
                <Text style={s.payTxt}>Dinheiro</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[s.btnPrimary, loading && s.btnDisabled]}
              onPress={handleCriarFrete}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#042c14" />
                : <Text style={s.btnPrimaryTxt}>Confirmar e buscar motorista</Text>
              }
            </TouchableOpacity>
            <Text style={s.priceNote}>Você só paga quando o motorista chegar</Text>
          </View>
        )}

        {/* ═══ PASSO 4: AGUARDANDO MOTORISTA ═══ */}
        {step === 4 && (
          <View style={s.waitingWrap}>
            <View style={s.pulseOuter}>
              <View style={s.pulseInner}>
                <Text style={s.pulseEmoji}>🚗</Text>
              </View>
            </View>

            <Text style={s.waitTitle}>Buscando motorista...</Text>
            <Text style={s.waitSub}>
              Seu frete foi publicado.{'\n'}
              Você será notificado assim que um{'\n'}
              motorista aceitar.
            </Text>

            <View style={s.waitInfoCard}>
              <View style={s.waitRow}>
                <Text style={s.waitKey}>De</Text>
                <Text style={s.waitVal} numberOfLines={1}>{originAddress}</Text>
              </View>
              <View style={s.waitRow}>
                <Text style={s.waitKey}>Para</Text>
                <Text style={s.waitVal} numberOfLines={1}>{destAddress}</Text>
              </View>
              <View style={s.waitRow}>
                <Text style={s.waitKey}>Total</Text>
                <Text style={[s.waitVal, { color: '#00d48a' }]}>
                  {pricing ? fmt(pricing.totalPrice) : '—'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => router.replace('/(tabs)/mapa')}
            >
              <Text style={s.btnSecondaryTxt}>Acompanhar no mapa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btnSecondary, { marginTop: 10, borderColor: '#e05555' }]}
              onPress={() => {
                if (freteId) {
                  api.post(`/fretes/${freteId}/cancelar`, { reason: 'Embarcador cancelou' })
                    .catch(() => {})
                }
                router.back()
              }}
            >
              <Text style={[s.btnSecondaryTxt, { color: '#e05555' }]}>Cancelar frete</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  )
}

// ── Estilos ───────────────────────────────────
const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a1520' },
  header:       { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50 },
  backBtn:      { padding: 4 },
  backTxt:      { color: '#00d48a', fontSize: 14 },
  steps:        { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 4 },
  stepBar:      { flex: 1, height: 3, borderRadius: 99, backgroundColor: '#1a2535' },
  stepBarActive:{ backgroundColor: '#00d48a' },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, paddingBottom: 40 },

  stepTitle:    { fontSize: 20, fontWeight: '700', color: '#e8f0f8', marginBottom: 4 },
  stepSub:      { fontSize: 12, color: '#4a6070', marginBottom: 20 },

  label:        { fontSize: 11, fontWeight: '500', color: '#4a6070', marginBottom: 8,
                  textTransform: 'uppercase', letterSpacing: 1 },

  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                  backgroundColor: '#111e2e', borderRadius: 12,
                  borderWidth: 1, borderColor: '#1a2535',
                  paddingHorizontal: 14, marginBottom: 14 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  input:        { flex: 1, color: '#e8f0f8', fontSize: 14, paddingVertical: 14 },

  vehicleGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  vehicleCard:  { width: '30%', backgroundColor: '#111e2e', borderRadius: 10,
                  borderWidth: 1.5, borderColor: '#1a2535',
                  padding: 10, alignItems: 'center' },
  vehicleCardSel:{ borderColor: '#00d48a', backgroundColor: '#00d48a10' },
  vehicleEmoji: { fontSize: 22, marginBottom: 4 },
  vehicleLbl:   { fontSize: 10, color: '#4a6070', fontWeight: '500', textAlign: 'center' },
  vehicleLblSel:{ color: '#00d48a' },

  helperRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: '#111e2e', borderRadius: 12,
                  borderWidth: 1, borderColor: '#1a2535',
                  padding: 14, marginBottom: 16 },
  helperTxt:    { fontSize: 14, color: '#e8f0f8', fontWeight: '500' },
  helperSub:    { fontSize: 11, color: '#4a6070', marginTop: 2 },
  toggle:       { width: 44, height: 24, borderRadius: 99, backgroundColor: '#1a2535' },
  toggleOn:     { backgroundColor: '#00d48a' },
  toggleThumb:  { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                  margin: 2, transition: 'all 0.2s' } as any,
  toggleThumbOn:{ marginLeft: 22 },

  whenRow:      { flexDirection: 'row', gap: 10, marginBottom: 16 },
  whenBtn:      { flex: 1, backgroundColor: '#111e2e', borderRadius: 12,
                  borderWidth: 1.5, borderColor: '#1a2535',
                  padding: 12, alignItems: 'center' },
  whenBtnSel:   { borderColor: '#00d48a', backgroundColor: '#00d48a10' },
  whenTxt:      { fontSize: 13, color: '#4a6070', fontWeight: '500' },
  whenTxtSel:   { color: '#00d48a' },

  routeCard:    { backgroundColor: '#111e2e', borderRadius: 12,
                  borderWidth: 1, borderColor: '#1a2535',
                  padding: 14, marginBottom: 14 },
  routeRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeLine:    { width: 1, height: 16, backgroundColor: '#2a4060', marginLeft: 3.5, marginVertical: 4 },
  routeAddr:    { fontSize: 12, color: '#e8f0f8', fontWeight: '500' },
  routeLbl:     { fontSize: 10, color: '#4a6070' },

  priceCard:    { backgroundColor: '#111e2e', borderRadius: 12,
                  borderWidth: 1, borderColor: '#1a2535',
                  padding: 14, marginBottom: 8 },
  priceRow:     { flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 5 },
  priceKey:     { fontSize: 13, color: '#4a6070' },
  priceVal:     { fontSize: 13, color: '#e8f0f8', fontWeight: '500' },
  priceRowTotal:{ borderTopWidth: 1, borderTopColor: '#1a2535', marginTop: 6, paddingTop: 10 },
  priceTotalKey:{ fontSize: 14, color: '#e8f0f8', fontWeight: '600' },
  priceTotalVal:{ fontSize: 22, color: '#00d48a', fontWeight: '700' },
  priceNote:    { fontSize: 11, color: '#4a6070', textAlign: 'center', marginBottom: 14 },

  payRow:       { flexDirection: 'row', gap: 10, marginBottom: 16 },
  payBtn:       { flex: 1, backgroundColor: '#111e2e', borderRadius: 12,
                  borderWidth: 1.5, borderColor: '#1a2535',
                  padding: 12, alignItems: 'center' },
  payBtnSel:    { borderColor: '#00d48a', backgroundColor: '#00d48a10' },
  payTxt:       { fontSize: 13, color: '#4a6070', fontWeight: '500' },
  payTxtSel:    { fontSize: 13, color: '#00d48a', fontWeight: '600' },

  btnPrimary:   { backgroundColor: '#00d48a', borderRadius: 14,
                  padding: 16, alignItems: 'center', marginBottom: 10 },
  btnPrimaryTxt:{ fontSize: 15, fontWeight: '700', color: '#042c14' },
  btnDisabled:  { opacity: 0.6 },

  btnSecondary: { borderRadius: 14, borderWidth: 1, borderColor: '#1a2535',
                  padding: 14, alignItems: 'center' },
  btnSecondaryTxt:{ fontSize: 14, color: '#e8f0f8', fontWeight: '500' },

  // Aguardando
  waitingWrap:  { alignItems: 'center', paddingTop: 20 },
  pulseOuter:   { width: 100, height: 100, borderRadius: 50,
                  backgroundColor: '#00d48a18', borderWidth: 1, borderColor: '#00d48a30',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  pulseInner:   { width: 70, height: 70, borderRadius: 35,
                  backgroundColor: '#00d48a30', borderWidth: 2, borderColor: '#00d48a',
                  alignItems: 'center', justifyContent: 'center' },
  pulseEmoji:   { fontSize: 30 },
  waitTitle:    { fontSize: 22, fontWeight: '700', color: '#e8f0f8', marginBottom: 10 },
  waitSub:      { fontSize: 14, color: '#4a6070', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  waitInfoCard: { backgroundColor: '#111e2e', borderRadius: 12,
                  borderWidth: 1, borderColor: '#1a2535',
                  padding: 16, width: '100%', marginBottom: 24 },
  waitRow:      { flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#0f1923' },
  waitKey:      { fontSize: 12, color: '#4a6070' },
  waitVal:      { fontSize: 12, color: '#e8f0f8', fontWeight: '500', maxWidth: '70%', textAlign: 'right' },
})
