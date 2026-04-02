// ================================================
// MUVV ROTAS — Script de reconciliação financeira
//
// OBJETIVO: corrigir dados corrompidos da fase
// anterior onde wallet.balance = 0 e
// WalletTransaction.balance = 0 para todos.
//
// IDEMPOTENTE: pode ser executado mais de uma vez
// sem duplicar efeitos. Recalcula e sobrescreve.
//
// USO:
//   cd apps/backend
//   npx tsx src/database/reconciliacao_financeira.ts
//
// RECOMENDAÇÃO: rodar primeiro em dev, validar,
// depois em produção.
// ================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error']
})

async function reconciliar() {
  console.log('\n================================================')
  console.log('🔄 RECONCILIAÇÃO FINANCEIRA — MUVV ROTAS')
  console.log('================================================\n')

  // ── FASE 1: Corrigir WalletTransaction.balance ──
  // Para cada wallet, percorre as transações em
  // ordem cronológica e recalcula o campo balance
  // (saldo após cada operação).
  console.log('📋 FASE 1 — Recalcular balance de cada transação\n')

  const wallets = await prisma.wallet.findMany({
    include: {
      user: { select: { name: true, email: true, role: true } },
      transactions: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  let walletCount      = 0
  let txCorrigidas     = 0
  let walletCorrigidas = 0

  for (const wallet of wallets) {
    walletCount++
    console.log(`  👤 ${wallet.user.name} (${wallet.user.role})`)
    console.log(`     Carteira: ${wallet.id.slice(0, 8)}...`)
    console.log(`     Transações: ${wallet.transactions.length}`)

    if (wallet.transactions.length === 0) {
      console.log(`     → Sem transações. Pulando.\n`)
      continue
    }

    // Recalcula saldo progressivo
    let saldoProgressivo = 0

    for (const tx of wallet.transactions) {
      if (tx.type === 'credit') {
        saldoProgressivo = parseFloat((saldoProgressivo + tx.amount).toFixed(2))
      } else if (tx.type === 'debit' || tx.type === 'withdrawal') {
        saldoProgressivo = parseFloat((saldoProgressivo - tx.amount).toFixed(2))
      }

      // Só atualiza se o valor estiver errado (idempotência)
      if (Math.abs(tx.balance - saldoProgressivo) >= 0.01) {
        await prisma.walletTransaction.update({
          where: { id: tx.id },
          data:  { balance: saldoProgressivo }
        })
        txCorrigidas++
        console.log(
          `     ✏️  TX ${tx.id.slice(0, 8)}... balance: ${tx.balance} → ${saldoProgressivo}`
        )
      }
    }

    // Saldo final calculado pelo histórico
    const saldoFinal    = saldoProgressivo
    const totalCreditos = wallet.transactions
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => parseFloat((acc + t.amount).toFixed(2)), 0)

    // Atualiza wallet apenas se necessário (idempotência)
    const balanceDivergencia     = Math.abs(wallet.balance - saldoFinal)
    const totalEarnedDivergencia = Math.abs(wallet.totalEarned - totalCreditos)

    if (balanceDivergencia >= 0.01 || totalEarnedDivergencia >= 0.01) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance:     saldoFinal,
          totalEarned: totalCreditos
        }
      })
      walletCorrigidas++
      console.log(`     ✅ Saldo corrigido:`)
      console.log(`        balance:     ${wallet.balance} → ${saldoFinal}`)
      console.log(`        totalEarned: ${wallet.totalEarned} → ${totalCreditos}`)
    } else {
      console.log(`     ✅ Saldo já consistente (${saldoFinal})`)
    }

    console.log()
  }

  // ── FASE 2: Verificação final ──────────────────
  console.log('🔍 FASE 2 — Verificação de consistência pós-correção\n')

  let inconsistencias = 0

  for (const wallet of await prisma.wallet.findMany({
    include: {
      user:         { select: { name: true } },
      transactions: { orderBy: { createdAt: 'asc' } }
    }
  })) {
    const somaCreditos = wallet.transactions
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => parseFloat((acc + t.amount).toFixed(2)), 0)

    const saldoRecalculado = wallet.transactions.reduce((acc, t) => {
      if (t.type === 'credit') return parseFloat((acc + t.amount).toFixed(2))
      if (t.type === 'debit' || t.type === 'withdrawal') return parseFloat((acc - t.amount).toFixed(2))
      return acc
    }, 0)

    const balanceBate     = Math.abs(wallet.balance - saldoRecalculado) < 0.01
    const totalEarnedBate = Math.abs(wallet.totalEarned - somaCreditos) < 0.01

    if (!balanceBate || !totalEarnedBate) {
      inconsistencias++
      console.log(`  ❌ ${wallet.user.name} ainda inconsistente!`)
      console.log(`     balance no banco: ${wallet.balance}, calculado: ${saldoRecalculado}`)
      console.log(`     totalEarned no banco: ${wallet.totalEarned}, calculado: ${somaCreditos}`)
    } else {
      console.log(`  ✅ ${wallet.user.name} — consistente (R$${wallet.balance})`)
    }
  }

  // ── RESULTADO FINAL ────────────────────────────
  console.log('\n================================================')
  console.log('📊 RESULTADO DA RECONCILIAÇÃO')
  console.log('================================================')
  console.log(`Carteiras processadas:     ${walletCount}`)
  console.log(`Transações corrigidas:     ${txCorrigidas}`)
  console.log(`Carteiras corrigidas:      ${walletCorrigidas}`)
  console.log(`Inconsistências restantes: ${inconsistencias}`)

  if (inconsistencias === 0) {
    console.log('\n✅ Todos os saldos estão consistentes.')
    console.log('   O sistema está pronto para uso com dinheiro real.\n')
  } else {
    console.log('\n❌ Ainda existem inconsistências. Verificar manualmente.\n')
    process.exit(1)
  }
}

reconciliar()
  .catch(err => {
    console.error('\n❌ Erro durante reconciliação:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
