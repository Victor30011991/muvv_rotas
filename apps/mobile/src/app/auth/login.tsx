// ================================================
// MUVV ROTAS — Tela de Login
// ================================================

import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../store/auth.store'

export default function LoginScreen() {
  const router  = useRouter()
  const login   = useAuthStore(s => s.login)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Atenção', 'Preencha email e senha')
    }

    setLoading(true)
    try {
      await login(email.trim().toLowerCase(), password)
      router.replace('/(tabs)/mapa')
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Erro ao fazer login'
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

        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>MUVV</Text>
          <Text style={styles.logoSub}>Rotas</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Entrar</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/cadastro')}>
            <Text style={styles.linkText}>Não tem conta? Cadastre-se</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoArea:  { alignItems: 'center', marginBottom: 48 },
  logoText:  { fontSize: 48, fontWeight: '700', color: '#fff', letterSpacing: 4 },
  logoSub:   { fontSize: 18, color: '#00e0a0', letterSpacing: 6, marginTop: -8 },

  form: { gap: 8 },

  label: { fontSize: 13, fontWeight: '500', color: '#aab', marginBottom: 4 },

  input: {
    backgroundColor: '#1a2535',
    borderWidth: 1,
    borderColor: '#2a3545',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    marginBottom: 12
  },

  btn: {
    backgroundColor: '#00a070',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '600' },

  linkText: {
    color: '#00e0a0',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14
  }
})
