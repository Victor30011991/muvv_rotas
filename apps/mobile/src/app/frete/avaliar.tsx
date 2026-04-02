// ================================================
// MUVV ROTAS — Avaliação pós-entrega (Embarcador)
// ================================================

import React, { useState, useEffect } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { api } from '../../lib/api'

export default function Avaliar() {
  const router  = useRouter()
  const { id }  = useLocalSearchParams<{ id: string }>()
  const [rating,   setRating]   = useState(0)
  const [comment,  setComment]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [frete,    setFrete]    = useState<any>(null)

  useEffect(() => {
    if (!id) return
    api.get(`/fretes/${id}`).then(r => setFrete(r.data.frete)).catch(() => {})
  }, [id])

  const handleAvaliar = async () => {
    if (rating === 0) {
      Alert.alert('Atenção', 'Selecione uma avaliação de 1 a 5 estrelas.')
      return
    }
    setLoading(true)
    try {
      await api.post('/avaliacoes', {
        freightId: id,
        rating,
        comment: comment.trim() || undefined,
      })
      router.replace('/(tabs)/mapa')
    } catch (err: any) {
      // Se já avaliou ou erro, vai para home
      router.replace('/(tabs)/mapa')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

  return (
    <View style={s.container}>
      <View style={s.content}>

        {/* Check */}
        <View style={s.checkCircle}>
          <Text style={s.checkEmoji}>✓</Text>
        </View>

        <Text style={s.title}>Entregue com sucesso!</Text>

        {frete && (
          <Text style={s.sub}>
            {frete.driver?.name ?? 'Motorista'} ·{' '}
            {frete.distanceKm?.toFixed(1) ?? '—'} km ·{' '}
            {fmt(frete.totalPrice)}
          </Text>
        )}

        {/* Avaliação */}
        <Text style={s.ratingTitle}>Como foi o serviço?</Text>
        <View style={s.starsRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} onPress={() => setRating(n)} style={s.starBtn}>
              <Text style={[s.star, n <= rating && s.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={s.ratingLabel}>
            {['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente!'][rating]}
          </Text>
        )}

        {/* Comentário */}
        <Text style={s.commentLabel}>Comentário (opcional)</Text>
        <TextInput
          style={s.commentInput}
          placeholder="Motorista pontual, cuidadoso..."
          placeholderTextColor="#3a5570"
          value={comment}
          onChangeText={setComment}
          multiline
        />

        {/* Botão */}
        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleAvaliar}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#042c14" />
            : <Text style={s.btnTxt}>Enviar avaliação</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(tabs)/mapa')}>
          <Text style={s.skipTxt}>Pular avaliação</Text>
        </TouchableOpacity>

      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a1520', justifyContent: 'center' },
  content:      { padding: 28, alignItems: 'center' },
  checkCircle:  { width: 72, height: 72, borderRadius: 36,
                  backgroundColor: '#00d48a18', borderWidth: 2, borderColor: '#00d48a',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  checkEmoji:   { fontSize: 32, color: '#00d48a' },
  title:        { fontSize: 22, fontWeight: '700', color: '#e8f0f8', marginBottom: 6 },
  sub:          { fontSize: 13, color: '#4a6070', marginBottom: 28, textAlign: 'center' },
  ratingTitle:  { fontSize: 16, fontWeight: '600', color: '#e8f0f8', marginBottom: 14, alignSelf: 'flex-start' },
  starsRow:     { flexDirection: 'row', gap: 10, marginBottom: 6 },
  starBtn:      { padding: 4 },
  star:         { fontSize: 36, color: '#1a2535' },
  starActive:   { color: '#f0a020' },
  ratingLabel:  { fontSize: 13, color: '#f0a020', fontWeight: '500', marginBottom: 20 },
  commentLabel: { fontSize: 12, color: '#4a6070', alignSelf: 'flex-start',
                  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  commentInput: { width: '100%', backgroundColor: '#111e2e',
                  borderWidth: 1.5, borderColor: '#1a2535', borderRadius: 12,
                  padding: 14, color: '#e8f0f8', fontSize: 14,
                  height: 90, textAlignVertical: 'top', marginBottom: 20 },
  btn:          { width: '100%', backgroundColor: '#00d48a', borderRadius: 14,
                  padding: 16, alignItems: 'center', marginBottom: 12 },
  btnTxt:       { fontSize: 15, fontWeight: '700', color: '#042c14' },
  btnDisabled:  { opacity: 0.6 },
  skipTxt:      { fontSize: 13, color: '#4a6070' },
})
