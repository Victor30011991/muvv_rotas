// ================================================
// MUVV ROTAS — Testes de concorrência
//
// Valida que múltiplas chamadas simultâneas
// resultam em exatamente 1 pagamento.
// ================================================

import { describe, it, expect, vi } from 'vitest'
import { confirmarEntrega } from '../services/delivery.service'
import { Prisma } from '@prisma/client'

// Frete válido em Decimal
const makeFreteDecimal = (overrides = {}) => ({
  id:             'frete-concurrent-001',
  driverId:       'driver-001',
  shipperId:      'shipper-001',
  title:          'Frete concorrência',
  status:         'IN_TRANSIT',
  totalPrice:     new Prisma.Decimal('100.00'),
  platformFee:    new Prisma.Decimal('10.00'),
  driverReceives: new Prisma.Decimal('90.00'),
  ...overrides
})

const makeLog = () => ({
  info:  vi.fn(),
  warn:  vi.fn(),
  error: vi.fn()
})

// ------------------------------------------------
// Testes de concorrência com Promise.all
// ------------------------------------------------
describe('Concorrência — múltiplas chamadas simultâneas', () => {

  it('deve garantir exatamente 1 sucesso em 5 chamadas paralelas', async () => {
    let transactionCallCount = 0
    let processedCount       = 0

    const makePrismaWithLock = () => ({
      financialEvent: { create: vi.fn() },
      $transaction: vi.fn().mockImplementation(async (fn: any, opts: any) => {
        transactionCallCount++
        const currentCall = transactionCallCount

        // Simula lock: apenas a primeira executa
        const tx = {
          $queryRaw: vi.fn().mockImplementation(async (query: any) => {
            const q = query?.strings?.[0] ?? ''
            if (q.includes('FOR UPDATE') && q.includes('freights')) {
              return [makeFreteDecimal()]
            }
            if (q.includes('FOR UPDATE') && q.includes('wallets')) {
              return [{
                id:          'wallet-001',
                userId:      'driver-001',
                balance:     new Prisma.Decimal('50.00'),
                totalEarned: new Prisma.Decimal('200.00')
              }]
            }
            if (q.includes('UPDATE wallets') && q.includes('RETURNING')) {
              if (currentCall === 1) {
                // Primeira: incrementa
                return [{ balance: new Prisma.Decimal('140.00'), totalEarned: new Prisma.Decimal('290.00') }]
              }
              // Demais: simulam erro de serialização
              const err = Object.assign(new Error('serialization failure'), { code: 'P2034' })
              throw err
            }
            return []
          }),
          freight:           { update: vi.fn() },
          payment:           { findUnique: vi.fn().mockResolvedValue({ id: 'pay-001' }), update: vi.fn() },
          walletTransaction: {
            findFirst: vi.fn().mockImplementation(async () => {
              processedCount++
              // Após a primeira transaction completar, retorna existente
              if (processedCount > 1) {
                return { id: 'tx-001', reference: 'frete-concurrent-001', type: 'credit' }
              }
              return null
            }),
            create: vi.fn()
          },
          driverProfile:  { update: vi.fn() },
          financialEvent: { create: vi.fn() }
        }

        return await fn(tx)
      })
    })

    const log = makeLog()

    // 5 chamadas simultâneas
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        confirmarEntrega(
          makePrismaWithLock() as any,
          'frete-concurrent-001',
          'driver-001',
          log
        )
      )
    )

    const successResults = results.filter(r => r.ok)
    const failedResults  = results.filter(r => !r.ok)

    // Exatamente 1 sucesso
    expect(successResults.length).toBe(1)

    // Os demais são bloqueados (409 ou falha de serialização)
    expect(failedResults.length).toBe(4)

    // Todos os bloqueios têm código conhecido
    failedResults.forEach(r => {
      if (!r.ok) {
        expect(['ALREADY_PROCESSED', 'TRANSACTION_FAILED']).toContain(r.code)
      }
    })
  })


  it('deve retornar o saldo correto apenas para o sucesso', async () => {
    const prisma = {
      financialEvent: { create: vi.fn() },
      $transaction: vi.fn().mockImplementationOnce(async (fn: any) => {
        const tx = {
          $queryRaw: vi.fn()
            .mockResolvedValueOnce([makeFreteDecimal()])
            .mockResolvedValueOnce([{ id: 'w-1', userId: 'driver-001', balance: new Prisma.Decimal('50'), totalEarned: new Prisma.Decimal('100') }])
            .mockResolvedValueOnce([{ balance: new Prisma.Decimal('140.00'), totalEarned: new Prisma.Decimal('190.00') }]),
          freight:           { update: vi.fn() },
          payment:           { findUnique: vi.fn().mockResolvedValue({ id: 'p-1' }), update: vi.fn() },
          walletTransaction: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
          driverProfile:     { update: vi.fn() },
          financialEvent:    { create: vi.fn() }
        }
        return await fn(tx)
      })
    }

    const log = makeLog()
    const result = await confirmarEntrega(prisma as any, 'frete-concurrent-001', 'driver-001', log)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Saldo = 50 (atual) + 90 (frete) = 140
    expect(result.newBalance.toString()).toBe('140.00')
    expect(result.driverReceives.toString()).toBe('90.00')
  })


  it('deve tratar P2034 (serialization failure) como TRANSACTION_FAILED', async () => {
    const serializationError = Object.assign(
      new Error('could not serialize access due to concurrent update'),
      { code: 'P2034' }
    )

    const prisma = {
      financialEvent: { create: vi.fn() },
      $transaction: vi.fn().mockRejectedValue(serializationError)
    }

    const log = makeLog()
    const result = await confirmarEntrega(prisma as any, 'frete-001', 'driver-001', log)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('TRANSACTION_FAILED')
    expect(result.detail).toBe('SERIALIZATION_FAILURE')

    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SERIALIZATION_FAILURE' })
    )
  })


  it('deve usar Decimal para precisão — sem erro de ponto flutuante', async () => {
    // Valores que quebram com Float: 0.1 + 0.2 ≠ 0.3 em IEEE 754
    const freteDecimalPrecision = makeFreteDecimal({
      totalPrice:     new Prisma.Decimal('87.50'),
      platformFee:    new Prisma.Decimal('8.75'),
      driverReceives: new Prisma.Decimal('78.75')
    })

    const prisma = {
      financialEvent: { create: vi.fn() },
      $transaction: vi.fn().mockImplementation(async (fn: any) => {
        const tx = {
          $queryRaw: vi.fn()
            .mockResolvedValueOnce([freteDecimalPrecision])
            .mockResolvedValueOnce([{ id: 'w-1', userId: 'driver-001', balance: new Prisma.Decimal('10.10'), totalEarned: new Prisma.Decimal('100') }])
            .mockResolvedValueOnce([{ balance: new Prisma.Decimal('88.85'), totalEarned: new Prisma.Decimal('178.75') }]),
          freight:           { update: vi.fn() },
          payment:           { findUnique: vi.fn().mockResolvedValue({ id: 'p-1' }), update: vi.fn() },
          walletTransaction: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
          driverProfile:     { update: vi.fn() },
          financialEvent:    { create: vi.fn() }
        }
        return await fn(tx)
      })
    }

    const log = makeLog()
    const result = await confirmarEntrega(prisma as any, 'frete-decimal', 'driver-001', log)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // 10.10 + 78.75 = 88.85 — sem drift
    expect(result.newBalance.toString()).toBe('88.85')

    // Decimal não produz 88.85000000000001
    expect(result.newBalance.equals(new Prisma.Decimal('88.85'))).toBe(true)
  })


  it('deve registrar FinancialEvent em caso de falha', async () => {
    const dbError = new Error('Connection lost')

    const financialEventCreate = vi.fn().mockResolvedValue({})
    const prisma = {
      financialEvent: { create: financialEventCreate },
      $transaction:   vi.fn().mockRejectedValue(dbError)
    }

    const log = makeLog()
    await confirmarEntrega(prisma as any, 'frete-fail', 'driver-001', log)

    // Deve tentar gravar o evento de falha fora da transaction
    expect(financialEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'DELIVERY_FAILED'
        })
      })
    )
  })
})
