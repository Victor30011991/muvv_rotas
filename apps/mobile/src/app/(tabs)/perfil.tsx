// ================================================
// MUVV ROTAS — Tela de Perfil
// ================================================

import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, RefreshControl
} from 'react-native'
import { useAuthStore } from '../../store/auth.store'
import { api } from '../../lib/api'

interface DriverData {
  name:     string
  email:    string
  phone:    string
  avatarUrl?: string
  driverProfile?: {
    rating:       number
    totalTrips:   number
    loyaltyBadge: string
    isAvailable:  boolean
    vehicle?: {
      type:  string
      brand: string
      model: string
      year:  number
      plate: string
    }
  }
  wallet?: { balance: number; totalEarned: number }
}

const BADGES: Record<string, { label: string; color: string; emoji: string }> = {
  bronze: { label: 'Bronze',  color: '#cd7f32', emoji: '🥉' },
  silver: { label: 'Prata',   color: '#aaa',    emoji: '🥈' },
  gold:   { label: 'Ouro',    color: '#ffd700', emoji: '🥇' }
}

export default function PerfilScreen() {
  const { user, logout }  = useAuthStore()
  const [data,       setData]       = useState<DriverData | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await api.get('/motoristas/perfil')
      setData(res.data.driver)
    } catch {}
  }

  useEffect(() => { load() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar' },
      { text: 'Sair', style: 'destructive', onPress: logout }
    ])
  }

  const badge = data?.driverProfile?.loyaltyBadge
    ? BADGES[data.driverProfile.loyaltyBadge]
    : null

  const stars = (rating: number) =>
    '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e0a0" />}
    >
      {/* Avatar e nome */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>
            {(data?.name ?? user?.name ?? 'M')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{data?.name ?? user?.name}</Text>
        <Text style={styles.email}>{data?.email ?? user?.email}</Text>

        {/* Badge de fidelidade */}
        {badge && (
          <View style={[styles.badgeBox, { borderColor: badge.color }]}>
            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
            <Text style={[styles.badgeLabel, { color: badge.color }]}>
              Parceiro {badge.label}
            </Text>
          </View>
        )}
      </View>

      {/* Stats do motorista */}
      {data?.driverProfile && (
        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              {stars(data.driverProfile.rating ?? 0)}
            </Text>
            <Text style={styles.statLabel}>
              {(data.driverProfile.rating ?? 0).toFixed(1)} avaliação
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{data.driverProfile.totalTrips}</Text>
            <Text style={styles.statLabel}>Fretes feitos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>
              R$ {(data.wallet?.totalEarned ?? 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total ganho</Text>
          </View>
        </View>
      )}

      {/* Dados do veículo */}
      {data?.driverProfile?.vehicle && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meu veículo</Text>
          <View style={styles.card}>
            <Row label="Tipo"   value={data.driverProfile.vehicle.type} />
            <Row label="Modelo" value={`${data.driverProfile.vehicle.brand} ${data.driverProfile.vehicle.model}`} />
            <Row label="Ano"    value={String(data.driverProfile.vehicle.year)} />
            <Row label="Placa"  value={data.driverProfile.vehicle.plate} last />
          </View>
        </View>
      )}

      {/* Contato */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meus dados</Text>
        <View style={styles.card}>
          <Row label="Telefone" value={data?.phone ?? user?.phone ?? '--'} />
          <Row label="Email"    value={data?.email ?? user?.email ?? '--'} last />
        </View>
      </View>

      {/* LGPD */}
      <View style={styles.lgpdBox}>
        <Text style={styles.lgpdTitle}>🛡️ LGPD — Seus dados estão protegidos</Text>
        <Text style={styles.lgpdTxt}>
          Seus dados são tratados conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
          Nunca compartilhamos suas informações com terceiros sem sua autorização.
        </Text>
      </View>

      {/* Sair */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutTxt}>Sair da conta</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },

  header: { alignItems: 'center', padding: 32, paddingTop: 48 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1a3a2a', borderWidth: 2, borderColor: '#00a070',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  avatarTxt: { fontSize: 32, fontWeight: '700', color: '#00e0a0' },
  name:      { fontSize: 22, fontWeight: '700', color: '#fff' },
  email:     { fontSize: 13, color: '#8a9aaa', marginTop: 4, marginBottom: 12 },

  badgeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 5
  },
  badgeEmoji: { fontSize: 16 },
  badgeLabel: { fontSize: 13, fontWeight: '600' },

  statsCard: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: '#1a2535', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#2a3545', marginBottom: 16
  },
  stat:        { flex: 1, alignItems: 'center' },
  statNum:     { fontSize: 16, fontWeight: '700', color: '#fff' },
  statLabel:   { fontSize: 11, color: '#8a9aaa', marginTop: 4, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: '#2a3545' },

  section:      { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: '#8a9aaa',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8
  },
  card: {
    backgroundColor: '#1a2535', borderRadius: 14,
    borderWidth: 1, borderColor: '#2a3545'
  },
  row:        { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  rowBorder:  { borderBottomWidth: 0.5, borderBottomColor: '#2a3545' },
  rowLabel:   { fontSize: 13, color: '#8a9aaa' },
  rowValue:   { fontSize: 13, color: '#fff', fontWeight: '500' },

  lgpdBox: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#0d1e15', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1a3a25'
  },
  lgpdTitle: { fontSize: 13, fontWeight: '600', color: '#00a070', marginBottom: 6 },
  lgpdTxt:   { fontSize: 12, color: '#6a8a7a', lineHeight: 18 },

  logoutBtn: {
    marginHorizontal: 16, backgroundColor: '#1a1520',
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#3a2535'
  },
  logoutTxt: { color: '#e08080', fontWeight: '600', fontSize: 15 }
})
