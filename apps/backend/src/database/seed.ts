// ================================================
// MUVV ROTAS — Seed do banco de dados
// Popula tabela de preços com dados reais de Parnaíba
// Cria usuário admin para testes
// ================================================

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n')

  // ---- TABELA DE PREÇOS (dados reais de Parnaíba-PI) ----
  console.log('💰 Criando tabela de preços...')

  const precos = [
    {
      vehicleType: 'MOTO' as const,
      baseRate:   15,
      ratePerKm:  2.50,
      minPrice:   25,
      helperRate: 0
    },
    {
      vehicleType: 'CARGA_LEVE' as const,
      // Fiorino, Pickup, Kombi, Hilux
      baseRate:   50,
      ratePerKm:  4.00,
      minPrice:   50,
      helperRate: 60
    },
    {
      vehicleType: 'VAN' as const,
      // Van, Sprinter, Ducato
      baseRate:   120,
      ratePerKm:  8.00,
      minPrice:   150,
      helperRate: 100
    },
    {
      vehicleType: 'CAMINHAO_MEDIO' as const,
      // Caminhão 3/4, Toco
      baseRate:   150,
      ratePerKm:  10.0,
      minPrice:   150,
      helperRate: 120
    },
    {
      vehicleType: 'CAMINHAO_GRANDE' as const,
      // Truck, Bitruck, Carreta
      baseRate:   300,
      ratePerKm:  14.0,
      minPrice:   300,
      helperRate: 150
    }
  ]

  for (const preco of precos) {
    await prisma.vehiclePricing.upsert({
      where:  { vehicleType: preco.vehicleType },
      update: preco,
      create: preco
    })
    console.log(`  ✅ ${preco.vehicleType} — base: R$${preco.baseRate} / km: R$${preco.ratePerKm}`)
  }

  // ---- USUÁRIO ADMIN ----
  console.log('\n👤 Criando usuário admin...')

  const adminPassword = await bcrypt.hash('muvv@admin2026', 10)

  await prisma.user.upsert({
    where: { email: 'admin@muvvrotas.com.br' },
    update: {},
    create: {
      name:     'Admin Muvv',
      email:    'admin@muvvrotas.com.br',
      phone:    '86999999999',
      password: adminPassword,
      role:     'ADMIN',
      status:   'ACTIVE'
    }
  })

  console.log('  ✅ admin@muvvrotas.com.br criado')

  // ---- MOTORISTA DE TESTE ----
  console.log('\n🚗 Criando motorista de teste...')

  const driverPassword = await bcrypt.hash('motorista123', 10)

  const driver = await prisma.user.upsert({
    where: { email: 'motorista@teste.com' },
    update: {},
    create: {
      name:     'Carlos Motorista',
      email:    'motorista@teste.com',
      phone:    '86988881111',
      password: driverPassword,
      role:     'DRIVER',
      status:   'ACTIVE',
      wallet: { create: {} },
      driverProfile: {
        create: {
          rating:       4.8,
          totalTrips:   12,
          loyaltyBadge: 'bronze',
          isAvailable:  true,
          vehicle: {
            create: {
              type:       'CARGA_LEVE',
              brand:      'Fiat',
              model:      'Fiorino',
              year:       2019,
              plate:      'ABC1D23',
              color:      'Branca',
              capacityKg: 700,
              bodyType:   'fechada',
              isVerified: true
            }
          }
        }
      }
    }
  })

  console.log(`  ✅ ${driver.name} criado (motorista@teste.com / motorista123)`)

  // ---- EMBARCADOR DE TESTE ----
  console.log('\n📦 Criando embarcador de teste...')

  const shipperPassword = await bcrypt.hash('embarcador123', 10)

  const shipper = await prisma.user.upsert({
    where: { email: 'embarcador@teste.com' },
    update: {},
    create: {
      name:     'João Embarcador',
      email:    'embarcador@teste.com',
      phone:    '86988882222',
      password: shipperPassword,
      role:     'SHIPPER',
      status:   'ACTIVE'
    }
  })

  console.log(`  ✅ ${shipper.name} criado (embarcador@teste.com / embarcador123)`)

  console.log('\n✅ Seed concluído com sucesso!\n')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
