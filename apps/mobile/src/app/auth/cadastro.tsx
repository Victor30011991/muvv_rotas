// ================================================
// MUVV ROTAS — Tela de Cadastro
// ================================================

import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../store/auth.store'

export default function CadastroScreen() {
  const router   = useRouter()
  const register = useAuthStore(s => s.register)

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState<'DRIVER' | 'SHIPPER'>('DRIVER')
  const [loading,  setLoading]  = useState(false)

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      return Alert.alert('Atenção', 'Preencha todos os campos')
    }
    if (password.length < 6) {
      return Alert.alert('Atenção', 'Senha deve ter ao menos 6 caracteres')
    }

    setLoading(true)
    try {
      await register({ name, email: email.trim().toLowerCase(), phone, password, role })
      router.replace('/(tabs)/mapa')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Erro ao cadastrar'
      Alert.alert('Erro', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.sub}>Muvv Rotas — Logística do Nordeste</Text>

        {/* Tipo de conta */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'DRIVER' && styles.roleBtnActive]}
            onPress={() => setRole('DRIVER')}
          >
            <Text style={[styles.roleTxt, role === 'DRIVER' && styles.roleTxtActive]}>
              🚗  Sou motorista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'SHIPPER' && styles.roleBtnActive]}
            onPress={() => setRole('SHIPPER')}
          >
            <Text style={[styles.roleTxt, role === 'SHIPPER' && styles.roleTxtActive]}>
              📦  Preciso de frete
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nome completo</Text>
        <TextInput style={styles.input} placeholder="Seu nome" placeholderTextColor="#888"
          value={name} onChangeText={setName} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="seu@email.com" placeholderTextColor="#888"
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>WhatsApp</Text>
        <TextInput style={styles.input} placeholder="(86) 99999-9999" placeholderTextColor="#888"
          value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Senha</Text>
        <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#888"
          value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Criar conta</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Já tenho conta — Entrar</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  scroll:    { flexGrow: 1, padding: 24, paddingTop: 48 },

  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  sub:   { fontSize: 13, color: '#8a9aaa', marginBottom: 32 },

  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleBtn: {
    flex: 1, padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#2a3545',
    alignItems: 'center'
  },
  roleBtnActive: { borderColor: '#00a070', backgroundColor: '#0d2a20' },
  roleTxt:       { fontSize: 13, color: '#8a9aaa' },
  roleTxtActive: { color: '#00e0a0', fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '500', color: '#aab', marginBottom: 4 },
  input: {
    backgroundColor: '#1a2535',
    borderWidth: 1, borderColor: '#2a3545',
    borderRadius: 10, padding: 14,
    fontSize: 15, color: '#fff', marginBottom: 12
  },

  btn: {
    backgroundColor: '#00a070', borderRadius: 10,
    padding: 16, alignItems: 'center', marginTop: 8
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '600' },

  linkText: { color: '#00e0a0', textAlign: 'center', marginTop: 20, fontSize: 14 }
})
