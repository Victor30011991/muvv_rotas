// ================================================
// MUVV ROTAS — Tela de configuração PIX
// ================================================

import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, ScrollView
} from 'react-native'
import { api } from '../../lib/api'

const TIPOS_PIX = [
  { value: 'cpf',        label: 'CPF',            mask: '000.000.000-00' },
  { value: 'telefone',   label: 'Telefone',        mask: '(00) 00000-0000' },
  { value: 'email',      label: 'Email',           mask: 'seu@email.com' },
  { value: 'aleatoria',  label: 'Chave aleatória', mask: 'Cole sua chave aqui' }
]

export default function PixScreen() {
  const [tipo,    setTipo]    = useState('telefone')
  const [chave,   setChave]   = useState('')
  const [loading, setLoading] = useState(false)

  const salvar = async () => {
    if (!chave.trim()) {
      return Alert.alert('Atenção', 'Preencha sua chave PIX')
    }

    setLoading(true)
    try {
      await api.put('/motoristas/pix', {
        pixKey:     chave.trim(),
        pixKeyType: tipo
      })
      Alert.alert('✅ PIX configurado!',
        'Você receberá seus pagamentos nesta chave ao confirmar entregas.')
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar sua chave PIX')
    } finally {
      setLoading(false)
    }
  }

  const tipoAtual = TIPOS_PIX.find(t => t.value === tipo)

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurar PIX</Text>
        <Text style={styles.sub}>
          Ao confirmar uma entrega, o valor será enviado automaticamente para sua chave PIX
        </Text>
      </View>

      {/* Como funciona */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Como funciona</Text>
        <View style={styles.step}>
          <Text style={styles.stepNum}>1</Text>
          <Text style={styles.stepTxt}>Você confirma a entrega no app</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>2</Text>
          <Text style={styles.stepTxt}>O pagamento é gerado automaticamente</Text>
        </View>
        <View style={styles.step}>
          <Text style={styles.stepNum}>3</Text>
          <Text style={styles.stepTxt}>Você recebe na sua conta em instantes</Text>
        </View>
      </View>

      {/* Tipo de chave */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tipo de chave PIX</Text>
        <View style={styles.tiposRow}>
          {TIPOS_PIX.map(t => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tipoBtn, tipo === t.value && styles.tipoBtnActive]}
              onPress={() => { setTipo(t.value); setChave('') }}
            >
              <Text style={[styles.tipoTxt, tipo === t.value && styles.tipoTxtActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input da chave */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Sua chave {tipoAtual?.label}</Text>
        <TextInput
          style={styles.input}
          placeholder={tipoAtual?.mask}
          placeholderTextColor="#556"
          value={chave}
          onChangeText={setChave}
          keyboardType={tipo === 'email' ? 'email-address' : tipo === 'telefone' ? 'phone-pad' : 'default'}
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.6 }]}
        onPress={salvar}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnTxt}>Salvar chave PIX</Text>
        }
      </TouchableOpacity>

      <View style={styles.lgpd}>
        <Text style={styles.lgpdTxt}>
          🔒 Sua chave PIX é armazenada com criptografia e usada apenas para seus pagamentos no Muvv Rotas.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },

  header: { padding: 24, paddingTop: 48 },
  title:  { fontSize: 22, fontWeight: '700', color: '#fff' },
  sub:    { fontSize: 13, color: '#8a9aaa', marginTop: 6, lineHeight: 20 },

  infoBox: {
    margin: 16, backgroundColor: '#0d2a20',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#1a4a30'
  },
  infoTitle: { fontSize: 13, fontWeight: '600', color: '#00e0a0', marginBottom: 12 },
  step:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stepNum:   {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#00a070', textAlign: 'center',
    lineHeight: 24, fontSize: 12, fontWeight: '700', color: '#fff'
  },
  stepTxt:   { fontSize: 13, color: '#8a9aaa' },

  section:      { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '500', color: '#aab', marginBottom: 10 },

  tiposRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoBtn:  {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1, borderColor: '#2a3545'
  },
  tipoBtnActive: { borderColor: '#00a070', backgroundColor: '#0d2a20' },
  tipoTxt:       { fontSize: 12, color: '#8a9aaa' },
  tipoTxtActive: { color: '#00e0a0', fontWeight: '500' },

  input: {
    backgroundColor: '#1a2535', borderWidth: 1, borderColor: '#2a3545',
    borderRadius: 12, padding: 14, fontSize: 15, color: '#fff'
  },

  btn: {
    marginHorizontal: 16, backgroundColor: '#00a070',
    borderRadius: 14, padding: 16, alignItems: 'center'
  },
  btnTxt: { color: '#fff', fontWeight: '600', fontSize: 16 },

  lgpd: { margin: 16, padding: 12, backgroundColor: '#0a1520', borderRadius: 10 },
  lgpdTxt: { fontSize: 12, color: '#6a7a8a', lineHeight: 18 }
})
