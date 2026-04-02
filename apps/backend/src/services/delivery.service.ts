// ================================================
// MUVV ROTAS — Serviço de entrega v2
//
// MUDANÇAS v2:
// [1] SELECT FOR UPDATE via interactive transaction
//     Elimina race condition na leitura do frete.
//     Toda a lógica ocorre dentro de uma única
//     transaction interativa — não array.
//
// [2] Decimal em vez de Float
//     Precisão financeira absoluta.
//     Sem parseFloat, sem toFixed, sem acúmulo.
//
// [3] Incremento atômico no wallet
//     UPDATE SET balance = balance + amount
//     Elimina risco de leitura antiga do saldo.
//     O banco retorna o valor pós-incremento
//     para registrar no WalletTransaction.balance.
//
// [4] FinancialEvent para auditoria completa
//     Todo evento (sucesso ou falha) é gravado
//     na tabela financial_events.
// ================================================

import { PrismaClient, Prisma } from '@prisma/client'

// Tolerância para validação de integridade com Decimal
// Usamos Decimal.sub para comparação precisa
const DECIMAL_ZERO      = new Prisma.Decimal(0)
const INTEGRITY_TOLERANCE = new Prisma.Decimal('0.01')

export type DeliveryResult =
  | { ok: true;  driverReceives: Prisma.Decimal; newBalance: Prisma.Decimal }
  | { ok: false; code: DeliveryErrorCode; detail?: string }

export type DeliveryErrorCode =
  | 'ACCESS_DENIED'
  | 'INVALID_STATUS'
  | 'FINANCIAL_INTEGRITY_ERROR'
  | 'ALREADY_PROCESSED'
  | 'WALLET_NOT_FOUND'
  | 'PAYMENT_NOT_FOUND'
  | 'TRANSACTION_FAILED'

export interface LogAdapter {
  info:  (data: object) => void
  warn:  (data: object) => void
  error: (data: object) => void
}

export const DELIVERY_ERROR_STATUS: Record<DeliveryErrorCode, number> = {
  ACCESS_DENIED:             403,
  INVALID_STATUS:            400,
  FINANCIAL_INTEGRITY_ERROR: 422,
  ALREADY_PROCESSED:         409,
  WALLET_NOT_FOUND:          500,
  PAYMENT_NOT_FOUND:         500,
  TRANSACTION_FAILED:        500
}

// ------------------------------------------------
// FUNÇÃO PRINCIPAL
// ------------------------------------------------
export async function confirmarEntrega(
  prisma:          PrismaClient,
  freteId:         string,
  userId:          string,
  log:             LogAdapter,
  idempotencyKey?: string
): Promise<DeliveryResult> {

  const startedAt = Date.now()

  try {
    // ── TRANSACTION INTERATIVA ─────────────────────
    // Diferente do modo array, o modo interativo
    // permite lógica condicional dentro do bloco
    // e uso de $queryRaw (SELECT FOR UPDATE).
    //
    // isolationLevel: Serializable garante que
    // leituras dentro da transaction reflitam o
    // estado atual do banco, eliminando anomalias
    // de concorrência que Repeatable Read não cobre.
    const result = await prisma.$transaction(async (tx) => {

      // ── LOCK PESSIMISTA no frete ─────────────────
      // SELECT FOR UPDATE: bloqueia a linha do frete
      // até o fim da transaction.
      // Se outra transaction tentar bloquear a mesma
      // linha, ela aguarda até esta liberar.
      // Elimina race condition na verificação de status.
      const [freightRow] = await tx.$queryRaw<any[]>`
        SELECT
          id, "driverId", "shipperId", title, status,
          "totalPrice", "platformFee", "driverReceives"
        FROM freights
        WHERE id = ${freteId}
        FOR UPDATE
      `

      if (!freightRow) {
        return { ok: false as const, code: 'ACCESS_DENIED' as DeliveryErrorCode }
      }

      // Converte para Decimal para operações seguras
      const totalPrice     = new Prisma.Decimal(freightRow.totalPrice)
      const platformFee    = new Prisma.Decimal(freightRow.platformFee)
      const driverReceives = new Prisma.Decimal(freightRow.driverReceives)

      // ── VALIDAÇÃO DE ACESSO ──────────────────────
      if (freightRow.driverId !== userId) {
        return { ok: false as const, code: 'ACCESS_DENIED' as DeliveryErrorCode }
      }

      // ── VALIDAÇÃO DE STATUS ──────────────────────
      // Com SELECT FOR UPDATE, este status é garantido
      // como o estado atual — não uma leitura antiga.
      if (freightRow.status !== 'IN_TRANSIT') {
        return {
          ok:     false as const,
          code:   'INVALID_STATUS' as DeliveryErrorCode,
          detail: freightRow.status
        }
      }

      // ── VALIDAÇÃO DE INTEGRIDADE FINANCEIRA ──────
      // Decimal.add é preciso — sem erro de float.
      // platformFee + driverReceives deve = totalPrice
      // com tolerância de 0.01.
      const soma       = platformFee.add(driverReceives)
      const divergencia = soma.sub(totalPrice).abs()

      if (divergencia.greaterThanOrEqualTo(INTEGRITY_TOLERANCE)) {
        log.error({
          event: 'FINANCIAL_INTEGRITY_ERROR',
          freteId, userId,
          totalPrice:     totalPrice.toString(),
          platformFee:    platformFee.toString(),
          driverReceives: driverReceives.toString(),
          soma:           soma.toString(),
          divergencia:    divergencia.toString()
        })

        // Grava evento de erro para auditoria
        await tx.financialEvent.create({
          data: {
            type:    'INTEGRITY_ERROR',
            payload: {
              freteId, userId,
              totalPrice:     totalPrice.toString(),
              platformFee:    platformFee.toString(),
              driverReceives: driverReceives.toString(),
              divergencia:    divergencia.toString()
            }
          }
        })

        return { ok: false as const, code: 'FINANCIAL_INTEGRITY_ERROR' as DeliveryErrorCode }
      }

      // ── VERIFICAÇÃO DE DUPLICIDADE ────────────────
      // Dentro da transaction com lock — a verificação
      // é consistente com o estado atual do banco.
      const txExistente = await tx.walletTransaction.findFirst({
        where: { reference: freteId, type: 'credit' }
      })

      if (txExistente) {
        log.warn({ event: 'DUPLICATE_PAYMENT_BLOCKED', freteId, userId })
        return { ok: false as const, code: 'ALREADY_PROCESSED' as DeliveryErrorCode }
      }

      // ── WALLET: LOCK E VERIFICAÇÃO ────────────────
      // Também com SELECT FOR UPDATE para garantir
      // que o saldo lido é o saldo atual sem
      // concorrência de outras operações simultâneas.
      const [walletRow] = await tx.$queryRaw<any[]>`
        SELECT id, "userId", balance, "totalEarned"
        FROM wallets
        WHERE "userId" = ${freightRow.driverId}
        FOR UPDATE
      `

      if (!walletRow) {
        log.error({ event: 'WALLET_NOT_FOUND', freteId, driverId: freightRow.driverId })
        return { ok: false as const, code: 'WALLET_NOT_FOUND' as DeliveryErrorCode }
      }

      // ── A: Atualiza status do frete ───────────────
      await tx.freight.update({
        where: { id: freteId },
        data:  { status: 'DELIVERED', deliveredAt: new Date() }
      })

      // ── B: Atualiza status do pagamento ───────────
      const payment = await tx.payment.findUnique({ where: { freightId: freteId } })
      if (!payment) {
        return { ok: false as const, code: 'PAYMENT_NOT_FOUND' as DeliveryErrorCode }
      }
      await tx.payment.update({
        where: { freightId: freteId },
        data:  { status: 'PAID', paidAt: new Date() }
      })

      // ── C: INCREMENTO ATÔMICO DO SALDO ───────────
      // UPDATE SET balance = balance + driverReceives
      // O banco executa como operação única — não há
      // janela entre leitura e escrita do saldo.
      // Retorna o novo saldo diretamente via RETURNING.
      const [updatedWallet] = await tx.$queryRaw<{ balance: any; totalEarned: any }[]>`
        UPDATE wallets
        SET
          balance      = balance      + ${driverReceives}::numeric,
          "totalEarned" = "totalEarned" + ${driverReceives}::numeric,
          "updatedAt"  = NOW()
        WHERE "userId" = ${freightRow.driverId}
        RETURNING balance, "totalEarned"
      `

      const newBalance     = new Prisma.Decimal(updatedWallet.balance)
      const newTotalEarned = new Prisma.Decimal(updatedWallet.totalEarned)

      // ── D: Cria WalletTransaction ─────────────────
      // balance = newBalance (saldo real pós-incremento)
      // @@unique([reference, type]) como segunda barreira
      await tx.walletTransaction.create({
        data: {
          walletId:  walletRow.id,
          type:      'credit',
          amount:    driverReceives,
          balance:   newBalance,
          reference: freteId,
          note:      `Frete entregue: ${freightRow.title}`
        }
      })

      // ── E: Métricas do motorista ──────────────────
      await tx.driverProfile.update({
        where: { userId: freightRow.driverId },
        data:  { totalTrips: { increment: 1 } }
      })

      // ── F: Grava FinancialEvent para auditoria ────
      const executionTime = Date.now() - startedAt
      await tx.financialEvent.create({
        data: {
          type: 'DELIVERY_COMPLETED',
          payload: {
            freteId,
            driverId:        freightRow.driverId,
            amount:          driverReceives.toString(),
            platformFee:     platformFee.toString(),
            newBalance:      newBalance.toString(),
            newTotalEarned:  newTotalEarned.toString(),
            executionTimeMs: executionTime,
            idempotencyKey:  idempotencyKey ?? null
          }
        }
      })

      return {
        ok:             true as const,
        driverReceives: driverReceives,
        newBalance:     newBalance
      }

    }, {
      // Serializable: isolamento máximo.
      // Impede anomalias de concorrência que
      // Repeatable Read não previne.
      // Trade-off: throughput menor sob alta carga.
      // Para o volume atual de Parnaíba: adequado.
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    })

    if (result.ok) {
      const executionTime = Date.now() - startedAt
      log.info({
        event:           'DELIVERY_COMPLETED',
        freteId,
        userId,
        amount:          result.driverReceives.toString(),
        newBalance:      result.newBalance.toString(),
        executionTimeMs: executionTime,
        idempotencyKey:  idempotencyKey ?? null
      })
    }

    return result

  } catch (err: any) {

    const executionTime = Date.now() - startedAt

    // P2002: @@unique violada (race condition extrema)
    // Acontece quando duas transactions simultâneas
    // passam pelo SELECT FOR UPDATE em timing perfeito
    // mas a constraint ainda captura.
    if (err?.code === 'P2002') {
      log.warn({
        event:  'DUPLICATE_PAYMENT_BLOCKED',
        freteId, userId,
        source: 'bank_constraint'
      })
      return { ok: false, code: 'ALREADY_PROCESSED' }
    }

    // P2034: Serialization failure (conflito de transaction Serializable)
    // PostgreSQL detectou que duas transactions simultâneas
    // leram e modificariam dados conflitantes.
    // O cliente deve fazer retry — o resultado será consistente.
    if (err?.code === 'P2034') {
      log.warn({
        event:  'SERIALIZATION_FAILURE',
        freteId, userId,
        detail: 'Retry recomendado'
      })
      return { ok: false, code: 'TRANSACTION_FAILED', detail: 'SERIALIZATION_FAILURE' }
    }

    log.error({
      event:           'DELIVERY_FAILED',
      freteId,         userId,
      executionTimeMs: executionTime,
      error:           err?.message,
      prismaCode:      err?.code
    })

    // Tenta gravar o evento de falha fora da transaction
    // (que já fez rollback) para rastreabilidade
    try {
      await prisma.financialEvent.create({
        data: {
          type: 'DELIVERY_FAILED',
          payload: {
            freteId, userId,
            error:      err?.message,
            prismaCode: err?.code,
            executionTimeMs: executionTime
          }
        }
      })
    } catch {
      // Ignora erro ao gravar evento — o log já foi emitido
    }

    return { ok: false, code: 'TRANSACTION_FAILED', detail: err?.message }
  }
}
