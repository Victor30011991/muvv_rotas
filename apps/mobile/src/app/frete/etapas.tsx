// ================================================
// MUVV ROTAS — Tela de check por etapa + foto
// ================================================

import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Image
} from 'react-native'
import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { api } from '../../lib/api'

const ETAPAS = [
  { status: 'a_caminho',  label: 'A caminho da coleta',  emoji: '🚗', desc: 'Saí e estou indo até o local de coleta' },
  { status: 'coletando',  label: 'Coletando a carga',    emoji: '📦', desc: 'Estou no local e carregando a mercadoria' },
  { status: 'em_rota',    label: 'Em rota de entrega',   emoji: '🛣️', desc: 'Carga coletada, seguindo para o destino' },
  { status: 'chegando',   label: 'Chegando ao destino',  emoji: '📍', desc: 'Estou próximo do local de entrega' },
  { status: 'entregando', label: 'Realizando a entrega', emoji: '🤝', desc: 'Estou entregando a carga agora' }
]

export default function EtapasScreen() {
  const { freteId } = useLocalSearchParams<{ freteId: string }>()
  const router = useRouter()

  const [etapaAtual, setEtapaAtual] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [fotoUri,    setFotoUri]    = useState<string | null>(null)

  const checkEtapa = async (status: string) => {
    setLoading(true)
    try {
      // Pega localização atual
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync()
      let lat = 0, lng = 0
      if (permStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        lat = loc.coords.latitude
        lng = loc.coords.longitude
      }

      await api.post(`/rastreamento/${freteId}/check`, { status, lat, lng })
      setEtapaAtual(status)

      const etapa = ETAPAS.find(e => e.status === status)
      Alert.alert(`${etapa?.emoji} Etapa registrada!`, etapa?.label)
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar a etapa')
    } finally {
      setLoading(false)
    }
  }

  const tirarFoto = async () => {
    // No MVP, simula foto — integrar expo-camera na próxima fase
    Alert.alert(
      '📸 Foto da entrega',
      'Funcionalidade de câmera será ativada em breve. Por enquanto, marque a entrega como concluída.',
      [{ text: 'OK' }]
    )
  }

  const isFeita = (status: string) => {
    const idx = ETAPAS.findIndex(e => e.status === etapaAtual)
    const idxEtapa = ETAPAS.findIndex(e => e.status === status)
    return idx >= idxEtapa && etapaAtual !== null
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Etapas do frete</Text>
        <Text style={styles.sub}>Marque cada etapa conforme avança</Text>
      </View>

      <View style={styles.timeline}>
        {ETAPAS.map((etapa, i) => {
          const feita   = isFeita(etapa.status)
          const atual   = etapaAtual === etapa.status
          const proxima = !feita && (
            i === 0 ||
            isFeita(ETAPAS[i - 1]?.status)
          )

          return (
            <View key={etapa.status} style={styles.etapaRow}>
              {/* Linha vertical */}
              {i < ETAPAS.length - 1 && (
                <View style={[styles.linha, feita && styles.linhaFeita]} />
              )}

              {/* Círculo */}
              <View style={[
                styles.circulo,
                feita   && styles.circuloFeito,
                atual   && styles.circuloAtual,
                proxima && styles.circuloProxima
              ]}>
                <Text style={styles.circuloEmoji}>
                  {feita ? '✓' : etapa.emoji}
                </Text>
              </View>

              {/* Conteúdo */}
              <View style={styles.etapaContent}>
                <Text style={[styles.etapaLabel, feita && styles.etapaLabelFeita]}>
                  {etapa.label}
                </Text>
                <Text style={styles.etapaDesc}>{etapa.desc}</Text>

                {proxima && !feita && (
                  <TouchableOpacity
                    style={[styles.checkBtn, loading && { opacity: 0.6 }]}
                    onPress={() => checkEtapa(etapa.status)}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.checkBtnTxt}>Marcar esta etapa</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })}
      </View>

      {/* Foto da entrega */}
      {etapaAtual === 'entregando' && (
        <View style={styles.fotoSection}>
          <Text style={styles.fotoTitle}>📸 Foto da entrega</Text>
          <Text style={styles.fotoSub}>
            Tire uma foto para confirmar e gerar o comprovante
          </Text>
          <TouchableOpacity style={styles.fotoBtn} onPress={tirarFoto}>
            <Text style={styles.fotoBtnTxt}>Abrir câmera</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },

  header: { padding: 24, paddingTop: 48 },
  title:  { fontSize: 22, fontWeight: '700', color: '#fff' },
  sub:    { fontSize: 13, color: '#8a9aaa', marginTop: 4 },

  timeline: { paddingHorizontal: 20, paddingTop: 8 },

  etapaRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 24, position: 'relative'
  },

  linha: {
    position: 'absolute', left: 19, top: 44,
    width: 2, height: 40, backgroundColor: '#2a3545'
  },
  linhaFeita: { backgroundColor: '#00a070' },

  circulo: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1a2535', borderWidth: 2, borderColor: '#2a3545',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, flexShrink: 0
  },
  circuloFeito:   { backgroundColor: '#00a070', borderColor: '#00a070' },
  circuloAtual:   { borderColor: '#00e0a0', borderWidth: 3 },
  circuloProxima: { borderColor: '#378ADD' },
  circuloEmoji:   { fontSize: 16 },

  etapaContent: { flex: 1, paddingTop: 4 },
  etapaLabel:   { fontSize: 14, fontWeight: '600', color: '#aab' },
  etapaLabelFeita: { color: '#00e0a0' },
  etapaDesc:    { fontSize: 12, color: '#6a7a8a', marginTop: 2 },

  checkBtn: {
    marginTop: 10, backgroundColor: '#378ADD',
    borderRadius: 10, padding: 10, alignItems: 'center'
  },
  checkBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 13 },

  fotoSection: {
    margin: 20, backgroundColor: '#1a2535',
    borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#00a070'
  },
  fotoTitle: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 },
  fotoSub:   { fontSize: 12, color: '#8a9aaa', textAlign: 'center', marginBottom: 16 },
  fotoBtn:   {
    backgroundColor: '#00a070', borderRadius: 12,
    paddingHorizontal: 28, paddingVertical: 12
  },
  fotoBtnTxt: { color: '#fff', fontWeight: '600', fontSize: 14 }
})
