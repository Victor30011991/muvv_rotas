import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function auditoria() {
  console.log('\n====================================================')
  console.log('🔍 AUDITORIA FINANCEIRA COMPLETA — MUVV ROTAS')
  console.log('====================================================\n')

  // ─────────────────────────────────────────
  // 1. MAPEAMENTO DE TRANSAÇÕES
  // ─────────────────────────────────────────
  console.log('📌 1. MAPEAMENTO DE TRANSAÇÕES')
  console.log('─────────────────────────────────────────')

  const totalTx = await prisma.walletTransaction.count()
  const txBalanceZero = await prisma.walletTransaction.count({ where: { balance: 0 } })
  const txNegativas = await prisma.walletTransaction.count({ where: { amount: { lt: 0 } } })
  const txSemRef = await prisma.walletTransaction.count({ where: { reference: null } })
  const txSemNote = await prisma.walletTransaction.count({ where: { note: null } })

  console.log(`Total de WalletTransactions:       ${totalTx}`)
  console.log(`Com balance = 0:                   ${txBalanceZero} ${txBalanceZero > 0 ? '❌ BUG' : '✅'}`)
  console.log(`Com amount negativo:               ${txNegativas} ${txNegativas > 0 ? '⚠️ verificar' : '✅'}`)
  console.log(`Sem referenceId:                   ${txSemRef} ${txSemRef > 0 ? '⚠️ órfãs' : '✅'}`)
  console.log(`Sem note:                          ${txSemNote}`)

  if (totalTx > 0) {
    const todasTx = await prisma.walletTransaction.findMany({
      include: { wallet: { include: { user: { select: { name: true, email: true } } } } }
    })
    console.log('\nDetalhes de cada transação:')
    todasTx.forEach((tx, i) => {
      console.log(`  [${i+1}] ID: ${tx.id.slice(0,8)}... | tipo: ${tx.type} | amount: R$${tx.amount} | balance: R$${tx.balance} | ref: ${tx.reference ?? 'NULL'} | usuário: ${tx.wallet.user.name}`)
    })
  }

  // ─────────────────────────────────────────
  // 2. CONSISTÊNCIA DE SALDO
  // ─────────────────────────────────────────
  console.log('\n💰 2. CONSISTÊNCIA DE SALDO')
  console.log('─────────────────────────────────────────')

  const wallets = await prisma.wallet.findMany({
    include: {
      user: { select: { name: true, email: true, role: true } },
      transactions: true
    }
  })

  console.log(`Total de carteiras: ${wallets.length}`)
  let inconsistencias = 0

  for (const w of wallets) {
    const somaCreditos = w.transactions
      .filter(t => t.type === 'credit')
      .reduce((acc, t) => acc + t.amount, 0)
    const somaDebitos = w.transactions
      .filter(t => t.type === 'debit' || t.type === 'withdrawal')
      .reduce((acc, t) => acc + t.amount, 0)
    const saldoCalculado = parseFloat((somaCreditos - somaDebitos).toFixed(2))
    const saldoReal = w.balance
    const bate = Math.abs(saldoCalculado - saldoReal) < 0.01

    if (!bate) inconsistencias++

    console.log(`\n  👤 ${w.user.name} (${w.user.role})`)
    console.log(`     Saldo no banco:     R$${saldoReal}`)
    console.log(`     Saldo calculado:    R$${saldoCalculado}`)
    console.log(`     totalEarned:        R$${w.totalEarned}`)
    console.log(`     totalWithdrawn:     R$${w.totalWithdrawn}`)
    console.log(`     Nº transações:      ${w.transactions.length}`)
    console.log(`     Consistente:        ${bate ? '✅' : '❌ INCONSISTENTE'}`)
    if (saldoReal < 0) console.log(`     ⚠️  SALDO NEGATIVO`)
  }
  console.log(`\nTotal de inconsistências: ${inconsistencias} ${inconsistencias > 0 ? '❌' : '✅'}`)

  // ─────────────────────────────────────────
  // 3. ORIGEM DAS TRANSAÇÕES
  // ─────────────────────────────────────────
  console.log('\n🔁 3. ORIGEM DAS TRANSAÇÕES')
  console.log('─────────────────────────────────────────')

  const tiposTx = await prisma.walletTransaction.groupBy({
    by: ['type'],
    _count: { type: true }
  })
  console.log('Tipos encontrados:')
  tiposTx.forEach(t => console.log(`  ${t.type}: ${t._count.type}`))

  const txComRef = await prisma.walletTransaction.findMany({
    where: { reference: { not: null } }
  })
  const txSemReferencia = await prisma.walletTransaction.findMany({
    where: { reference: null }
  })
  console.log(`\nCom referência (rastreável): ${txComRef.length} ✅`)
  console.log(`Sem referência (órfã):       ${txSemReferencia.length} ${txSemReferencia.length > 0 ? '⚠️' : '✅'}`)

  // ─────────────────────────────────────────
  // 4. DETECÇÃO DE BUGS
  // ─────────────────────────────────────────
  console.log('\n🚨 4. DETECÇÃO DE BUGS')
  console.log('─────────────────────────────────────────')

  // Fretes entregues
  const fretesEntregues = await prisma.freight.findMany({
    where: { status: 'DELIVERED' },
    include: { payment: true }
  })
  console.log(`Fretes com status DELIVERED: ${fretesEntregues.length}`)

  // Para cada frete entregue, verificar se existe transação
  let freteSemTx = 0
  let freteComTxDuplicada = 0
  for (const f of fretesEntregues) {
    const txDoFrete = await prisma.walletTransaction.findMany({
      where: { reference: f.id }
    })
    if (txDoFrete.length === 0) {
      freteSemTx++
      console.log(`  ❌ Frete ${f.id.slice(0,8)} entregue SEM transação financeira`)
    }
    if (txDoFrete.length > 1) {
      freteComTxDuplicada++
      console.log(`  ⚠️  Frete ${f.id.slice(0,8)} com ${txDoFrete.length} transações (duplicidade?)`)
    }
  }
  if (fretesEntregues.length === 0) console.log('  Nenhum frete entregue ainda — seed apenas')
  if (freteSemTx === 0 && fretesEntregues.length > 0) console.log('  ✅ Todos os fretes entregues têm transação')
  console.log(`\nFretes entregues sem transação:     ${freteSemTx}`)
  console.log(`Fretes com transação duplicada:     ${freteComTxDuplicada}`)

  // Fretes cancelados com impacto financeiro
  const fresCancelados = await prisma.freight.findMany({
    where: { status: 'CANCELLED' }
  })
  let canceladosComTx = 0
  for (const f of fresCancelados) {
    const txDoFrete = await prisma.walletTransaction.findMany({
      where: { reference: f.id }
    })
    if (txDoFrete.length > 0) {
      canceladosComTx++
      console.log(`  ⚠️  Frete CANCELADO ${f.id.slice(0,8)} tem transação — verificar`)
    }
  }
  console.log(`Fretes cancelados com transação:    ${canceladosComTx} ${canceladosComTx > 0 ? '⚠️' : '✅'}`)

  // ─────────────────────────────────────────
  // 5. INTEGRIDADE DO FLUXO
  // ─────────────────────────────────────────
  console.log('\n🔒 5. INTEGRIDADE DO FLUXO')
  console.log('─────────────────────────────────────────')

  const todosFretes = await prisma.freight.findMany({
    include: { payment: true }
  })
  console.log(`Total de fretes no banco: ${todosFretes.length}`)

  const por_status = todosFretes.reduce((acc: any, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1
    return acc
  }, {})
  console.log('Por status:')
  Object.entries(por_status).forEach(([s, c]) => console.log(`  ${s}: ${c}`))

  // ─────────────────────────────────────────
  // 6. VALIDAÇÃO DE LÓGICA DE PREÇO
  // ─────────────────────────────────────────
  console.log('\n🧠 6. VALIDAÇÃO DE LÓGICA DE PREÇO')
  console.log('─────────────────────────────────────────')

  const fretesComPreco = await prisma.freight.findMany({
    where: { totalPrice: { gt: 0 } },
    select: {
      id: true, title: true, totalPrice: true,
      platformFee: true, driverReceives: true, status: true
    }
  })

  let errosLogica = 0
  for (const f of fretesComPreco) {
    const comissaoEsperada = parseFloat((f.totalPrice * 0.10).toFixed(2))
    const motoristEsperado = parseFloat((f.totalPrice - f.platformFee).toFixed(2))
    const comissaoBate = Math.abs(f.platformFee - comissaoEsperada) < 0.02
    const motoristaBate = Math.abs(f.driverReceives - motoristEsperado) < 0.02
    const soma = parseFloat((f.platformFee + f.driverReceives).toFixed(2))
    const somaBate = Math.abs(soma - f.totalPrice) < 0.02

    if (!comissaoBate || !motoristaBate || !somaBate) {
      errosLogica++
      console.log(`  ❌ Frete ${f.id.slice(0,8)}: total R$${f.totalPrice} | comissão R$${f.platformFee} (esperado R$${comissaoEsperada}) | motorista R$${f.driverReceives} | soma ${soma}`)
    }
  }
  if (fretesComPreco.length === 0) console.log('  Nenhum frete com preço — seed apenas')
  if (errosLogica === 0 && fretesComPreco.length > 0) console.log('  ✅ Lógica de preço consistente em todos os fretes')
  console.log(`Erros de lógica financeira: ${errosLogica}`)

  // ─────────────────────────────────────────
  // 7. AUDITORIA DE REFERÊNCIAS
  // ─────────────────────────────────────────
  console.log('\n🧾 7. AUDITORIA DE REFERÊNCIAS')
  console.log('─────────────────────────────────────────')

  const tiposValidos = ['credit', 'debit', 'withdrawal']
  const tiposForaPadrao = await prisma.walletTransaction.findMany({
    where: { type: { notIn: tiposValidos } }
  })
  console.log(`Tipos fora do padrão (credit/debit/withdrawal): ${tiposForaPadrao.length} ${tiposForaPadrao.length > 0 ? '⚠️' : '✅'}`)
  if (tiposForaPadrao.length > 0) {
    tiposForaPadrao.forEach(t => console.log(`  ⚠️  tipo: "${t.type}" | id: ${t.id.slice(0,8)}`))
  }

  // ─────────────────────────────────────────
  // 8. DADOS ÓRFÃOS
  // ─────────────────────────────────────────
  console.log('\n⚠️  8. DADOS ÓRFÃOS')
  console.log('─────────────────────────────────────────')

  // Wallets sem usuário (não deve acontecer com cascade)
  const walletsTotal = await prisma.wallet.count()
  const usersDrivers = await prisma.user.count({ where: { role: 'DRIVER' } })
  console.log(`Carteiras: ${walletsTotal} | Motoristas: ${usersDrivers}`)
  console.log(`Motoristas sem carteira: ${usersDrivers - walletsTotal > 0 ? usersDrivers - walletsTotal + ' ⚠️' : '0 ✅'}`)

  // ─────────────────────────────────────────
  // 9. TESTE DE CONFIANÇA
  // ─────────────────────────────────────────
  console.log('\n🧪 9. TESTE DE CONFIANÇA')
  console.log('─────────────────────────────────────────')

  const somaGlobalCreditos = await prisma.walletTransaction.aggregate({
    where: { type: 'credit' },
    _sum: { amount: true }
  })
  const somaGlobalDebitos = await prisma.walletTransaction.aggregate({
    where: { type: { in: ['debit', 'withdrawal'] } },
    _sum: { amount: true }
  })
  const somaGlobalSaldos = await prisma.wallet.aggregate({
    _sum: { balance: true }
  })

  const totalCreditos = somaGlobalCreditos._sum.amount ?? 0
  const totalDebitos  = somaGlobalDebitos._sum.amount ?? 0
  const totalSaldos   = somaGlobalSaldos._sum.balance ?? 0
  const saldoEsperado = parseFloat((totalCreditos - totalDebitos).toFixed(2))
  const somaBate = Math.abs(saldoEsperado - totalSaldos) < 0.01

  console.log(`Soma de créditos:         R$${totalCreditos.toFixed(2)}`)
  console.log(`Soma de débitos:          R$${totalDebitos.toFixed(2)}`)
  console.log(`Saldo esperado:           R$${saldoEsperado.toFixed(2)}`)
  console.log(`Soma real dos saldos:     R$${totalSaldos.toFixed(2)}`)
  console.log(`Balanço confere:          ${somaBate ? '✅ SIM' : '❌ NÃO — DIVERGÊNCIA DETECTADA'}`)

  // ─────────────────────────────────────────
  // 10. RESULTADO FINAL
  // ─────────────────────────────────────────
  console.log('\n====================================================')
  console.log('✅ RESULTADO FINAL DA AUDITORIA')
  console.log('====================================================')

  const podeProsseguir =
    inconsistencias === 0 &&
    freteSemTx === 0 &&
    freteComTxDuplicada === 0 &&
    canceladosComTx === 0 &&
    errosLogica === 0 &&
    somaBate &&
    tiposForaPadrao.length === 0

  if (txBalanceZero > 0) {
    console.log(`❌ ${txBalanceZero} transação(ões) com balance = 0 — bug confirmado no freight.routes.ts`)
  }
  if (inconsistencias > 0) {
    console.log(`❌ ${inconsistencias} carteira(s) com saldo inconsistente`)
  }
  if (!somaBate) {
    console.log(`❌ Balanço global não fecha — divergência de R$${Math.abs(saldoEsperado - totalSaldos).toFixed(2)}`)
  }
  if (podeProsseguir && txBalanceZero === 0) {
    console.log('✅ Base limpa — pode prosseguir com segurança')
  } else {
    console.log('\n⚠️  NÃO AVANÇAR sem corrigir os itens acima')
    console.log('Correção recomendada: script de recalculo de saldo')
  }

  console.log('\n====================================================\n')
}

auditoria()
  .catch(e => { console.error('Erro na auditoria:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
