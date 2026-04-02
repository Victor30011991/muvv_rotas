// ================================================
// MUVV ROTAS — Serviço de carteira
// Responsável por toda movimentação financeira
// ================================================

import { prisma } from '../lib/prisma'

interface CreditInput {
  userId:    string
  amount:    number
  reference: string
  note:      string
}

export async function creditWallet(input: CreditInput) {
  const { userId, amount, reference, note } = input

  // Busca a carteira atual
  const wallet = await prisma.wallet.findUnique({
    where: { userId }
  })

  if (!wallet) throw new Error('Carteira não encontrada')

  const newBalance    = parseFloat((wallet.balance + amount).toFixed(2))
  const newTotalEarned = parseFloat((wallet.totalEarned + amount).toFixed(2))

  // Atualiza carteira e cria transação de forma atômica
  const [updatedWallet] = await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: {
        balance:     newBalance,
        totalEarned: newTotalEarned
      }
    }),
    prisma.walletTransaction.create({
      data: {
        walletId:  wallet.id,
        type:      'credit',
        amount,
        balance:   newBalance,
        reference,
        note
      }
    })
  ])

  return updatedWallet
}
