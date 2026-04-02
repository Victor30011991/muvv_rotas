// ================================================
// MUVV ROTAS — Tela do Mapa
// ================================================

import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Alert, ActivityIndicator, ScrollView
} from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { useFreightStore, Freight } from '../../store/freight.store'
import { useAuthStore } from '../../store/auth.store'
import { api } from '../../lib/api'

// Parnaíba-PI coordenadas centrais
const PARNAIBA_COORDS = {
  latitude:       -2.9051,
  longitude:      -41.7752,
  latitudeDelta:   0.05,
  longitudeDelta:  0.05
}

export default function MapaScreen() {
  const user           = useAuthStore(s => s.user)
  const { available, active, loadAvailable, loadMyFreights, accept, refuse, startDelivery, confirmDelivery } = useFreightStore()

  const [location,  setLocation]  = useState<Location.LocationObject | null>(null)
  const [selected,  setSelected]  = useState<Freight | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [isOnline,  setIsOnline]  = useState(false)

  // Solicita permissão de localização
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos da sua localização para funcionar.')
        return
      }
      const loc = await Location.getCurrentPositionAsync({})
      setLocation(loc)
    })()
  }, [])

  // Atualiza localização no servidor a cada 30s (quando online)
  useEffect(() => {
    if (!isOnline || user?.role !== 'DRIVER') return
    const interval = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({})
      setLocation(loc)
      await api.put('/motoristas/localizacao', {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude
      }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [isOnline, user?.role])

  // Carrega fretes ao entrar
  useEffect(() => {
    loadAvailable()
    loadMyFreights()
  }, [])

  const toggleOnline = async () => {
    const next = !isOnline
    setIsOnline(next)
    await api.put('/motoristas/disponivel', { isAvailable: next }).catch(() => {})
  }

  const handleAccept = async (freight: Freight) => {
    setLoading(true)
    try {
      await accept(freight.id)
      setSelected(null)
      Alert.alert('✅ Frete aceito!', `Entre em contato com ${freight.shipper.name}`)
    } catch {
      Alert.alert('Erro', 'Não foi possível aceitar o frete')
    } finally {
      setLoading(false)
    }
  }

  const handleRefuse = async (freight: Freight) => {
    await refuse(freight.id)
    setSelected(null)
  }

  const isDriver  = user?.role === 'DRIVER'
  const isShipper = user?.role === 'SHIPPER'
  const router    = useRouter()

  return (
    <View style={styles.container}>

      {/* Mapa */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={PARNAIBA_COORDS}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Marcadores dos fretes disponíveis */}
        {available.map(freight => (
          <Marker
            key={freight.id}
            coordinate={{ latitude: 0, longitude: 0 }} // Será preenchido com coords reais
            title={freight.title}
            description={`R$ ${freight.totalPrice.toFixed(2)}`}
            onPress={() => setSelected(freight)}
          />
        ))}
      </MapView>

      {/* Toggle Online/Offline (só para motoristas) */}
      {isDriver && (
        <TouchableOpacity
          style={[styles.onlineBtn, isOnline ? styles.onlineBtnOn : styles.onlineBtnOff]}
          onPress={toggleOnline}
        >
          <View style={[styles.onlineDot, isOnline && styles.onlineDotActive]} />
          <Text style={styles.onlineTxt}>
            {isOnline ? 'Online — recebendo fretes' : 'Offline'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Frete ativo (em andamento) */}
      {active && (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>📦 Frete em andamento</Text>
          <Text style={styles.activeSub}>{active.title}</Text>
          <Text style={styles.activeRoute}>
            {active.originAddress} → {active.destAddress}
          </Text>
          <View style={styles.activeActions}>
            {active.status === 'MATCHED' && (
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => startDelivery(active.id)}
              >
                <Text style={styles.startBtnTxt}>Iniciar entrega</Text>
              </TouchableOpacity>
            )}
            {active.status === 'IN_TRANSIT' && (
              <TouchableOpacity
                style={styles.deliverBtn}
                onPress={() => {
                  Alert.alert('Confirmar entrega', 'A carga foi entregue?', [
                    { text: 'Não' },
                    { text: 'Sim', onPress: () => confirmDelivery(active.id) }
                  ])
                }}
              >
                <Text style={styles.deliverBtnTxt}>Confirmar entrega</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Lista de fretes disponíveis */}
      {!active && available.length > 0 && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Fretes disponíveis</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {available.slice(0, 5).map(freight => (
              <TouchableOpacity
                key={freight.id}
                style={styles.freightCard}
                onPress={() => setSelected(freight)}
              >
                <Text style={styles.freightPrice}>
                  R$ {freight.totalPrice.toFixed(2)}
                </Text>
                <Text style={styles.freightTitle} numberOfLines={1}>
                  {freight.title}
                </Text>
                <Text style={styles.freightDist}>
                  {freight.distanceKm?.toFixed(1)} km
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Modal de detalhe do frete */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selected && (
              <>
                <Text style={styles.modalTitle}>{selected.title}</Text>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>De:</Text>
                  <Text style={styles.modalValue}>{selected.originAddress}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Para:</Text>
                  <Text style={styles.modalValue}>{selected.destAddress}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Distância:</Text>
                  <Text style={styles.modalValue}>{selected.distanceKm?.toFixed(1)} km</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Veículo:</Text>
                  <Text style={styles.modalValue}>{selected.vehicleType}</Text>
                </View>
                {selected.helperIncluded && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Ajudante:</Text>
                    <Text style={styles.modalValue}>Incluído</Text>
                  </View>
                )}

                <View style={styles.priceBox}>
                  <Text style={styles.priceBig}>R$ {selected.totalPrice.toFixed(2)}</Text>
                  <Text style={styles.priceSub}>
                    Você recebe: R$ {selected.driverReceives.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.refuseBtn}
                    onPress={() => handleRefuse(selected)}
                  >
                    <Text style={styles.refuseTxt}>Recusar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, loading && { opacity: 0.6 }]}
                    onPress={() => handleAccept(selected)}
                    disabled={loading}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.acceptTxt}>Aceitar</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map:       { flex: 1 },

  onlineBtn: {
    position: 'absolute', top: 56, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 99, elevation: 4,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8
  },
  onlineBtnOn:  { backgroundColor: '#0a2a1a' },
  onlineBtnOff: { backgroundColor: '#1a2535' },
  onlineDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#555' },
  onlineDotActive: { backgroundColor: '#00e0a0' },
  onlineTxt:    { fontSize: 13, fontWeight: '500', color: '#fff' },

  activeCard: {
    position: 'absolute', bottom: 90, left: 16, right: 16,
    backgroundColor: '#0f1923', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#00a070',
    elevation: 8
  },
  activeTitle:   { fontSize: 12, color: '#00e0a0', fontWeight: '600', marginBottom: 4 },
  activeSub:     { fontSize: 16, color: '#fff', fontWeight: '700' },
  activeRoute:   { fontSize: 12, color: '#8a9aaa', marginTop: 4, marginBottom: 12 },
  activeActions: { flexDirection: 'row', gap: 10 },
  startBtn:   { flex: 1, backgroundColor: '#1a4a3a', borderRadius: 10, padding: 12, alignItems: 'center' },
  startBtnTxt:{ color: '#00e0a0', fontWeight: '600' },
  deliverBtn: { flex: 1, backgroundColor: '#00a070', borderRadius: 10, padding: 12, alignItems: 'center' },
  deliverBtnTxt: { color: '#fff', fontWeight: '600' },

  listContainer: {
    position: 'absolute', bottom: 90, left: 0, right: 0, paddingBottom: 8
  },
  listTitle: { color: '#fff', fontWeight: '600', paddingHorizontal: 16, marginBottom: 8 },
  freightCard: {
    backgroundColor: '#1a2535', borderRadius: 12, padding: 12,
    marginLeft: 16, width: 140, borderWidth: 1, borderColor: '#2a3545'
  },
  freightPrice: { fontSize: 18, fontWeight: '700', color: '#00e0a0' },
  freightTitle: { fontSize: 12, color: '#fff', marginTop: 4 },
  freightDist:  { fontSize: 11, color: '#8a9aaa', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#0f1923', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  modalRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modalLabel: { fontSize: 13, color: '#8a9aaa' },
  modalValue: { fontSize: 13, color: '#fff', fontWeight: '500', flex: 1, textAlign: 'right' },

  priceBox: {
    backgroundColor: '#1a2535', borderRadius: 12, padding: 16,
    alignItems: 'center', marginVertical: 16
  },
  priceBig: { fontSize: 32, fontWeight: '700', color: '#fff' },
  priceSub: { fontSize: 13, color: '#00e0a0', marginTop: 4 },

  modalActions: { flexDirection: 'row', gap: 12 },
  refuseBtn: {
    flex: 1, padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#2a3545', alignItems: 'center'
  },
  refuseTxt: { color: '#8a9aaa', fontWeight: '600' },
  acceptBtn: { flex: 2, backgroundColor: '#00a070', borderRadius: 12, padding: 16, alignItems: 'center' },
  acceptTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  createFreteBtn: {
    position: 'absolute', bottom: 90, alignSelf: 'center',
    backgroundColor: '#00d48a', borderRadius: 28,
    paddingHorizontal: 28, paddingVertical: 14,
  },
  createFreteTxt: { color: '#042c14', fontWeight: '700', fontSize: 15 }
})
