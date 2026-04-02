// ================================================
// MUVV ROTAS — Tela Financeira
// ================================================

import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity
} from 'react-native'
import { api } from '../../lib/api'

interface WalletData {
  balance:        number
  totalEarned:    number
  totalWithdrawn: number
  weeklyEarnings: number
}

interface Transaction {
  id:        string
  type:      string
  amount:    number
  balance:   number
  note:      string
  createdAt: string
}

export default function FinanceiroScreen() {
  const [wallet,       setWallet]       = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [refreshing,   setRefreshing]   = useState(false)

  const load = async () => {
    try {
      const [walletRes, txRes] = await Promise.all([
        api.get('/carteira'),
        api.get('/carteira/extrato')
      ])
      setWallet(walletRes.data.wallet)
      setTransactions(txRes.data.transacoes)
    } catch {}
  }

  useEffect(() => { load() }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const formatMoney = (v: number) =>
    `R$ ${v.toFixed(2).replace('.', ',')}`

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00e0a0" />}
    >
      {/* Card de saldo */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo disponível</Text>
        <Text style={styles.balanceValue}>
          {wallet ? formatMoney(wallet.balance) : 'R$ --,--'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Esta semana</Text>
            <Text style={styles.statValue}>
              {wallet ? formatMoney(wallet.weeklyEarnings) : '--'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Total ganho</Text>
            <Text style={styles.statValue}>
              {wallet ? formatMoney(wallet.totalEarned) : '--'}
            </Text>
          </View>
        </View>
      </View>

      {/* Ação de saque (futuro) */}
      <TouchableOpacity style={styles.withdrawBtn}>
        <Text style={styles.withdrawTxt}>Sacar via PIX</Text>
        <Text style={styles.withdrawSub}>Em breve disponível</Text>
      </TouchableOpacity>

      {/* Histórico */}
      <Text style={styles.sectionTitle}>Histórico de créditos</Text>

      {transactions.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTxt}>Nenhuma transação ainda</Text>
          <Text style={styles.emptySub}>Complete seu primeiro frete para ver aqui</Text>
        </View>
      )}

      {transactions.map(tx => (
        <View key={tx.id} style={styles.txRow}>
          <View style={[styles.txDot, tx.type === 'credit' ? styles.txDotCredit : styles.txDotDebit]} />
          <View style={styles.txInfo}>
            <Text style={styles.txNote}>{tx.note ?? tx.type}</Text>
            <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
          </View>
          <Text style={[styles.txAmount, tx.type === 'credit' ? styles.txCredit : styles.txDebit]}>
            {tx.type === 'credit' ? '+' : '-'}{formatMoney(tx.amount)}
          </Text>
        </View>
      ))}

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1923' },

  balanceCard: {
    margin: 16, backgroundColor: '#1a2535',
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#2a3545'
  },
  balanceLabel: { fontSize: 13, color: '#8a9aaa', marginBottom: 4 },
  balanceValue: { fontSize: 40, fontWeight: '700', color: '#fff', marginBottom: 20 },
  statsRow:     { flexDirection: 'row', alignItems: 'center' },
  stat:         { flex: 1 },
  statLabel:    { fontSize: 11, color: '#8a9aaa' },
  statValue:    { fontSize: 16, fontWeight: '600', color: '#00e0a0', marginTop: 2 },
  statDivider:  { width: 1, height: 32, backgroundColor: '#2a3545', marginHorizontal: 16 },

  withdrawBtn: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1a2535', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2a3545', alignItems: 'center'
  },
  withdrawTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
  withdrawSub: { fontSize: 11, color: '#8a9aaa', marginTop: 2 },

  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: '#8a9aaa',
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 16, marginTop: 16, marginBottom: 8
  },

  emptyBox: { padding: 32, alignItems: 'center' },
  emptyTxt: { fontSize: 15, color: '#fff', fontWeight: '500' },
  emptySub: { fontSize: 12, color: '#8a9aaa', marginTop: 4 },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: '#1a2535'
  },
  txDot:       { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  txDotCredit: { backgroundColor: '#00a070' },
  txDotDebit:  { backgroundColor: '#e05050' },
  txInfo:      { flex: 1 },
  txNote:      { fontSize: 13, color: '#fff' },
  txDate:      { fontSize: 11, color: '#8a9aaa', marginTop: 2 },
  txAmount:    { fontSize: 15, fontWeight: '600' },
  txCredit:    { color: '#00e0a0' },
  txDebit:     { color: '#e08080' }
})
