// ================================================
// MUVV ROTAS — Tela de Chat
// ================================================

import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useAuthStore } from '../../store/auth.store'
import { api } from '../../lib/api'

interface Mensagem {
  id:        string
  content:   string
  createdAt: string
  sender: {
    id:       string
    name:     string
    role:     string
    avatarUrl?: string
  }
}

export default function ChatScreen() {
  const { freteId, titulo } = useLocalSearchParams<{ freteId: string; titulo: string }>()
  const user = useAuthStore(s => s.user)

  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [texto,     setTexto]     = useState('')
  const [loading,   setLoading]   = useState(true)
  const [sending,   setSending]   = useState(false)
  const flatRef = useRef<FlatList>(null)

  const load = async () => {
    try {
      const { data } = await api.get(`/chat/${freteId}`)
      setMensagens(data.mensagens)
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // Polling simples a cada 5s para novas mensagens
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [freteId])

  const enviar = async () => {
    if (!texto.trim() || sending) return
    setSending(true)
    try {
      const { data } = await api.post(`/chat/${freteId}`, { content: texto.trim() })
      setMensagens(prev => [...prev, data.mensagem])
      setTexto('')
      setTimeout(() => flatRef.current?.scrollToEnd(), 100)
    } catch {} finally {
      setSending(false)
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const isMe = (senderId: string) => senderId === user?.id

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#00e0a0" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          💬 {titulo ?? 'Chat do frete'}
        </Text>
        <Text style={styles.headerSub}>Conversa privada e segura</Text>
      </View>

      {/* Mensagens */}
      <FlatList
        ref={flatRef}
        data={mensagens}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>Nenhuma mensagem ainda</Text>
            <Text style={styles.emptySub}>Inicie a conversa com o outro lado</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const meu = isMe(m.sender.id)
          return (
            <View style={[styles.bubble, meu ? styles.bubbleMe : styles.bubbleThem]}>
              {!meu && (
                <Text style={styles.senderName}>{m.sender.name}</Text>
              )}
              <Text style={[styles.bubbleText, meu && styles.bubbleTextMe]}>
                {m.content}
              </Text>
              <Text style={[styles.bubbleTime, meu && styles.bubbleTimeMe]}>
                {formatTime(m.createdAt)}
              </Text>
            </View>
          )
        }}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Digite uma mensagem..."
          placeholderTextColor="#556"
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={500}
          onSubmitEditing={enviar}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!texto.trim() || sending) && styles.sendBtnDisabled]}
          onPress={enviar}
          disabled={!texto.trim() || sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  loading:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1923' },

  header: {
    padding: 16, paddingTop: 48,
    backgroundColor: '#0a1520',
    borderBottomWidth: 1, borderBottomColor: '#1a2535'
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  headerSub:   { fontSize: 11, color: '#8a9aaa', marginTop: 2 },

  list:    { padding: 16, flexGrow: 1 },
  empty:   { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyTxt:{ fontSize: 15, color: '#fff' },
  emptySub:{ fontSize: 12, color: '#8a9aaa', marginTop: 4 },

  bubble: {
    maxWidth: '78%', borderRadius: 14, padding: 10, marginBottom: 8
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#00a070',
    borderBottomRightRadius: 4
  },
  bubbleThem: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a2535',
    borderBottomLeftRadius: 4
  },
  senderName:   { fontSize: 11, color: '#00e0a0', marginBottom: 3, fontWeight: '500' },
  bubbleText:   { fontSize: 14, color: '#fff', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime:   { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: 12, paddingBottom: 28,
    backgroundColor: '#0a1520',
    borderTopWidth: 1, borderTopColor: '#1a2535'
  },
  input: {
    flex: 1, backgroundColor: '#1a2535',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: '#fff', maxHeight: 100
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#00a070',
    alignItems: 'center', justifyContent: 'center'
  },
  sendBtnDisabled: { backgroundColor: '#1a3a2a' },
  sendIcon:        { color: '#fff', fontSize: 16 }
})
