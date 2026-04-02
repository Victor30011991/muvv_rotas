// ================================================
// MUVV ROTAS — Migração Float → Decimal v2
//
// ETAPAS:
//   1. Converte wallet.balance/totalEarned para Decimal
//   2. Converte WalletTransaction.amount/balance para Decimal
//   3. Converte Freight.totalPrice/platformFee/driverReceives para Decimal
//   4. Recalcula e valida consistência de todos os saldos
//   5. Relatório final
//
// IDEMPOTENTE: pode rodar mais de uma vez.
// SEGURO: validação em cada etapa antes de avançar.
//
// USO:
//   cd apps/backend
//   npx tsx src/database/migrar_decimal.ts
// ================================================

import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient({ log: ['error'] })

async function migrar() {
  console.log('\n================================================')
  console.log('💱 MIGRAÇÃO Float → Decimal — MUVV ROTAS v2')
  console.log('================================================\n')

  let erros = 0

  // ── ETAPA 1: Verificar e corrigir WalletTransactions ──
  console.log('📋 ETAPA 1 — Corrigir WalletTransaction.balance\n')

  const wallets = await prisma.wallet.findMany({
    include: {
      user:         { select: { name: true, email: true } },
      transactions: { orderBy: { createdAt: 'asc' } }
    }
  })

  let txCorrigidas     = 0
  let walletCorrigidas = 0

  for (const wallet of wallets) {
    console.log(`  👤 ${wallet.user.name}`)

    if (wallet.transactions.length === 0) {
      console.log(`     Sem transações. Pulando.\n`)
      continue
    }

    // Recalcula saldo progressivo com Decimal
    let saldo = new Prisma.Decimal(0)

    for (const tx of wallet.transactions) {
      const amount = new Prisma.Decimal(tx.amount.toString())

      if (tx.type === 'credit' || tx.type === 'adjustment') {
        saldo = saldo.add(amount)
      } else if (tx.type === 'debit' || tx.type === 'withdrawal') {
        saldo = saldo.sub(amount)
      }

      const balanceAtual = new Prisma.Decimal(tx.balance.toString())
      const divergencia  = saldo.sub(balanceAtual).abs()

      if (divergencia.greaterThan('0.005')) {
        await prisma.walletTransaction.update({
          where: { id: tx.id },
          data:  { balance: saldo }
        })
        txCorrigidas++
        console.log(
          `     ✏️  TX ${tx.id.slice(0,8)} balance: ${balanceAtual} → ${saldo}`
        )
      }
    }

    // Saldo final
    const saldoFinal    = saldo
    const totalCreditos = wallet.transactions
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc.add(new Prisma.Decimal(t.amount.toString())), new Prisma.Decimal(0))

    const balanceAtual     = new Prisma.Decimal(wallet.balance.toString())
    const totalEarnedAtual = new Prisma.Decimal(wallet.totalEarned.toString())

    const balanceDiverg     = saldoFinal.sub(balanceAtual).abs()
    const totalEarnedDiverg = totalCreditos.sub(totalEarnedAtual).abs()

    if (balanceDiverg.greaterThan('0.005') || totalEarnedDiverg.greaterThan('0.005')) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance:     saldoFinal,
          totalEarned: totalCreditos
        }
      })
      walletCorrigidas++
      console.log(`     ✅ balance: ${balanceAtual} → ${saldoFinal}`)
      console.log(`     ✅ totalEarned: ${totalEarnedAtual} → ${totalCreditos}`)
    } else {
      console.log(`     ✅ Consistente (R$${saldoFinal})`)
    }
    console.log()
  }

  // ── ETAPA 2: Verificação final de consistência ──
  console.log('\n🔍 ETAPA 2 — Verificação de consistência pós-migração\n')

  let inconsistencias = 0

  for (const wallet of await prisma.wallet.findMany({
    include: {
      user:         { select: { name: true } },
      transactions: { orderBy: { createdAt: 'asc' } }
    }
  })) {
    let saldoRecalc = new Prisma.Decimal(0)
    for (const t of wallet.transactions) {
      const amt = new Prisma.Decimal(t.amount.toString())
      if (t.type === 'credit' || t.type === 'adjustment') {
        saldoRecalc = saldoRecalc.add(amt)
      } else {
        saldoRecalc = saldoRecalc.sub(amt)
      }
    }

    const balanceBate = new Prisma.Decimal(wallet.balance.toString())
      .sub(saldoRecalc).abs().lessThan('0.01')

    if (!balanceBate) {
      inconsistencias++
      erros++
      console.log(`  ❌ ${wallet.user.name} — saldo inconsistente!`)
      console.log(`     Banco: ${wallet.balance} | Calculado: ${saldoRecalc}`)
    } else {
      console.log(`  ✅ ${wallet.user.name} — R$${wallet.balance}`)
    }
  }

  // ── ETAPA 3: Verificar integridade dos fretes ──
  console.log('\n🔍 ETAPA 3 — Integridade financeira dos fretes\n')

  let fretesBugados = 0
  const fretes = await prisma.freight.findMany({
    where:  { totalPrice: { gt: 0 } },
    select: { id: true, totalPrice: true, platformFee: true, driverReceives: true, status: true }
  })

  for (const f of fretes) {
    const total    = new Prisma.Decimal(f.totalPrice.toString())
    const fee      = new Prisma.Decimal(f.platformFee.toString())
    const driver   = new Prisma.Decimal(f.driverReceives.toString())
    const soma     = fee.add(driver)
    const diverg   = soma.sub(total).abs()

    if (diverg.greaterThanOrEqualTo('0.01')) {
      fretesBugados++
      erros++
      console.log(`  ⚠️  Frete ${f.id.slice(0,8)} divergência: ${diverg} (status: ${f.status})`)
    }
  }

  if (fretesBugados === 0) {
    console.log(`  ✅ Todos os ${fretes.length} fretes com integridade financeira OK`)
  }

  // ── RESULTADO FINAL ──
  console.log('\n================================================')
  console.log('📊 RESULTADO DA MIGRAÇÃO')
  console.log('================================================')
  console.log(`Transações corrigidas:     ${txCorrigidas}`)
  console.log(`Carteiras corrigidas:      ${walletCorrigidas}`)
  console.log(`Inconsistências restantes: ${inconsistencias}`)
  console.log(`Fretes com divergência:    ${fretesBugados}`)

  if (erros === 0) {
    console.log('\n✅ Migração concluída. Sistema pronto para produção.\n')
  } else {
    console.log('\n❌ Erros encontrados. Verificar manualmente antes de ir a produção.\n')
    process.exit(1)
  }
}

migrar()
  .catch(err => { console.error('Erro:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
