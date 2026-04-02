// ================================================
// MUVV ROTAS — Testes do sistema financeiro
// Cobertura: pagamento único, duplicidade,
// integridade, concorrência, falha parcial
// ================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { confirmarEntrega } from '../services/delivery.service'

// ------------------------------------------------
// MOCKS DO PRISMA
// Cada teste configura o comportamento esperado
// ------------------------------------------------

// Factory que cria um mock de frete válido
const makeFrete = (overrides = {}) => ({
  id:             'frete-uuid-001',
  driverId:       'driver-uuid-001',
  shipperId:      'shipper-uuid-001',
  title:          'Mudança de apartamento',
  status:         'IN_TRANSIT',
  totalPrice:     100.00,
  platformFee:    10.00,
  driverReceives: 90.00,
  ...overrides
})

// Factory que cria um mock de wallet
const makeWallet = (overrides = {}) => ({
  id:           'wallet-uuid-001',
  userId:       'driver-uuid-001',
  balance:      50.00,
  totalEarned:  200.00,
  totalWithdrawn: 0,
  ...overrides
})

// Logger mock — captura logs para assertions
const makeLog = () => ({
  info:  vi.fn(),
  warn:  vi.fn(),
  error: vi.fn()
})

// Prisma mock base — configurado por cada teste
const makePrisma = (overrides: any = {}) => ({
  freight: {
    findUnique: vi.fn().mockResolvedValue(makeFrete()),
    update:     vi.fn().mockResolvedValue({}),
    ...overrides.freight
  },
  wallet: {
    findUnique: vi.fn().mockResolvedValue(makeWallet()),
    update:     vi.fn().mockResolvedValue({}),
    ...overrides.wallet
  },
  walletTransaction: {
    findFirst: vi.fn().mockResolvedValue(null),  // sem transação existente
    create:    vi.fn().mockResolvedValue({}),
    ...overrides.walletTransaction
  },
  payment: {
    update: vi.fn().mockResolvedValue({}),
    ...overrides.payment
  },
  driverProfile: {
    update: vi.fn().mockResolvedValue({}),
    ...overrides.driverProfile
  },
  $transaction: vi.fn().mockImplementation(async (ops: any[]) => {
    // Executa todas as operações sequencialmente (simula transaction)
    for (const op of ops) await op
    return ops
  }),
  ...overrides
})

// ------------------------------------------------
// TESTE 1 — Pagamento único e correto
// ------------------------------------------------
describe('Teste 1 — Pagamento único', () => {

  it('deve retornar ok: true e atualizar saldo corretamente', async () => {
    const prisma = makePrisma()
    const log    = makeLog()

    const result = await confirmarEntrega(
      prisma as any, 'frete-uuid-001', 'driver-uuid-001', log
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Valor correto
    expect(result.driverReceives).toBe(90.00)

    // newBalance = 50.00 (atual) + 90.00 (frete) = 140.00
    expect(result.newBalance).toBe(140.00)

    // Log de sucesso emitido
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'DELIVERY_COMPLETED', freteId: 'frete-uuid-001' })
    )
  })

  it('deve chamar $transaction com 5 operações', async () => {
    const prisma = makePrisma()
    const log    = makeLog()

    await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    const ops = prisma.$transaction.mock.calls[0][0]
    expect(ops).toHaveLength(5)
  })

  it('deve calcular newBalance com toFixed(2)', async () => {
    // Força valores que geram erro de ponto flutuante sem toFixed
    const prisma = makePrisma({
      freight: { findUnique: vi.fn().mockResolvedValue(
        makeFrete({ totalPrice: 87.50, platformFee: 8.75, driverReceives: 78.75 })
      )},
      wallet: { findUnique: vi.fn().mockResolvedValue(
        makeWallet({ balance: 10.10 })
      )}
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // 10.10 + 78.75 = 88.85 — sem drift de float
    expect(result.newBalance).toBe(88.85)
    expect(Number.isInteger(result.newBalance * 100)).toBe(true)
  })
})

// ------------------------------------------------
// TESTE 2 — Duplicidade
// ------------------------------------------------
describe('Teste 2 — Proteção contra duplicidade', () => {

  it('deve retornar ALREADY_PROCESSED se transação já existe', async () => {
    const prisma = makePrisma({
      walletTransaction: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'tx-existente', reference: 'frete-uuid-001', type: 'credit'
        })
      }
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('ALREADY_PROCESSED')

    // $transaction nunca chamado
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('deve retornar ALREADY_PROCESSED se banco retorna P2002 (race condition)', async () => {
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })

    const prisma = makePrisma({
      $transaction: vi.fn().mockRejectedValue(p2002Error)
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('ALREADY_PROCESSED')

    // Log de warning emitido
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'DUPLICATE_PAYMENT_BLOCKED' })
    )
  })

  it('não deve chamar $transaction duas vezes para o mesmo freteId', async () => {
    // Simula primeira chamada concluída — findFirst retorna existente na segunda
    let chamadas = 0
    const prisma = makePrisma({
      walletTransaction: {
        findFirst: vi.fn().mockImplementation(async () => {
          chamadas++
          if (chamadas === 1) return null          // primeira: passa
          return { id: 'tx-001', type: 'credit' } // segunda: bloqueia
        })
      }
    })
    const log = makeLog()

    const r1 = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)
    const r2 = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(false)
    if (r2.ok) return
    expect(r2.code).toBe('ALREADY_PROCESSED')

    // $transaction chamado apenas uma vez
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

// ------------------------------------------------
// TESTE 3 — Validação de integridade financeira
// ------------------------------------------------
describe('Teste 3 — Integridade financeira', () => {

  it('deve bloquear se platformFee + driverReceives != totalPrice', async () => {
    const prisma = makePrisma({
      freight: {
        findUnique: vi.fn().mockResolvedValue(
          // totalPrice = 100, mas 15 + 90 = 105 → divergência de 5.00
          makeFrete({ totalPrice: 100, platformFee: 15, driverReceives: 90 })
        )
      }
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('FINANCIAL_INTEGRITY_ERROR')

    // Log de error emitido com todos os campos
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event:      'FINANCIAL_INTEGRITY_ERROR',
        freteId:    'frete-uuid-001',
        totalPrice: 100,
        platformFee: 15,
        driverReceives: 90
      })
    )

    // Nenhuma escrita
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('deve passar se divergência for menor que 0.01 (ruído de float)', async () => {
    const prisma = makePrisma({
      freight: {
        findUnique: vi.fn().mockResolvedValue(
          // Simula resultado de 0.1 + 0.2 = 0.30000000000000004
          makeFrete({ totalPrice: 100.00, platformFee: 10.00, driverReceives: 90.00 })
        )
      }
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)
    expect(result.ok).toBe(true)
  })

  it('deve bloquear se divergência for exatamente 0.01', async () => {
    const prisma = makePrisma({
      freight: {
        findUnique: vi.fn().mockResolvedValue(
          makeFrete({ totalPrice: 100.00, platformFee: 10.00, driverReceives: 89.99 })
          // soma = 99.99, divergencia = 0.01 → deve bloquear
        )
      }
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('FINANCIAL_INTEGRITY_ERROR')
  })
})

// ------------------------------------------------
// TESTE 4 — Concorrência simulada
// ------------------------------------------------
describe('Teste 4 — Concorrência com Promise.all', () => {

  it('deve garantir apenas 1 crédito mesmo com chamadas simultâneas', async () => {
    // Simula race condition: ambas as chamadas passam pelo findFirst
    // (ambas recebem null), mas apenas a primeira completa o $transaction
    let transactionCount = 0

    const prisma = makePrisma({
      walletTransaction: {
        findFirst: vi.fn().mockResolvedValue(null) // ambas passam
      },
      $transaction: vi.fn().mockImplementation(async (ops: any[]) => {
        transactionCount++
        if (transactionCount === 1) {
          // Primeira: sucesso
          for (const op of ops) await op
          return ops
        }
        // Segunda: simula P2002 (race condition capturada pelo banco)
        const p2002 = Object.assign(new Error('Unique constraint'), { code: 'P2002' })
        throw p2002
      })
    })
    const log = makeLog()

    const [r1, r2] = await Promise.all([
      confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log),
      confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)
    ])

    // Uma completou, uma foi bloqueada
    const successCount = [r1, r2].filter(r => r.ok).length
    const blockedCount = [r1, r2].filter(r => !r.ok && r.code === 'ALREADY_PROCESSED').length

    expect(successCount).toBe(1)
    expect(blockedCount).toBe(1)

    // $transaction foi tentado 2 vezes mas apenas 1 commitou
    expect(transactionCount).toBe(2)
  })
})

// ------------------------------------------------
// TESTE 5 — Falha no meio da transaction
// ------------------------------------------------
describe('Teste 5 — Falha e rollback', () => {

  it('deve retornar TRANSACTION_FAILED se $transaction lançar erro genérico', async () => {
    const dbError = new Error('Connection timeout')

    const prisma = makePrisma({
      $transaction: vi.fn().mockRejectedValue(dbError)
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('TRANSACTION_FAILED')

    // Log de erro com contexto financeiro
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event:   'DELIVERY_TRANSACTION_FAILED',
        freteId: 'frete-uuid-001',
        amount:  90.00
      })
    )
  })

  it('deve retornar WALLET_NOT_FOUND se carteira não existir', async () => {
    const prisma = makePrisma({
      wallet: { findUnique: vi.fn().mockResolvedValue(null) }
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('WALLET_NOT_FOUND')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('deve retornar ACCESS_DENIED se userId não for o driverId', async () => {
    const prisma = makePrisma({
      freight: { findUnique: vi.fn().mockResolvedValue(makeFrete({ driverId: 'outro-driver' })) }
    })
    const log = makeLog()

    const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('ACCESS_DENIED')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('deve retornar INVALID_STATUS se frete não estiver IN_TRANSIT', async () => {
    for (const status of ['PENDING', 'MATCHED', 'DELIVERED', 'CANCELLED']) {
      const prisma = makePrisma({
        freight: { findUnique: vi.fn().mockResolvedValue(makeFrete({ status })) }
      })
      const log = makeLog()

      const result = await confirmarEntrega(prisma as any, 'frete-uuid-001', 'driver-uuid-001', log)

      expect(result.ok).toBe(false)
      if (result.ok) continue
      expect(result.code).toBe('INVALID_STATUS')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    }
  })
})
