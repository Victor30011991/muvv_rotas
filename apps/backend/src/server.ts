// ================================================
// MUVV ROTAS — Servidor principal
// ================================================

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'

import { authRoutes } from './routes/auth.routes'
import { freightRoutes } from './routes/freight.routes'
import { driverRoutes } from './routes/driver.routes'
import { pricingRoutes } from './routes/pricing.routes'
import { walletRoutes } from './routes/wallet.routes'
import { reviewRoutes } from './routes/review.routes'
import { chatRoutes } from './routes/chat.routes'
import { trackingRoutes } from './routes/tracking.routes'
import { adminRoutes } from './routes/admin.routes'
import { saveIdempotencyResponse } from './middlewares/idempotent'

const app = Fastify({
  logger: process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty' } }
    : true
})

// ---- Plugins ----
app.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://muvvrotas.com.br']
    : true
})

app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'muvv-dev-secret'
})

// ---- Rotas ----
app.register(authRoutes,     { prefix: '/auth' })
app.register(freightRoutes,  { prefix: '/fretes' })
app.register(driverRoutes,   { prefix: '/motoristas' })
app.register(pricingRoutes,  { prefix: '/precos' })
app.register(walletRoutes,   { prefix: '/carteira' })
app.register(reviewRoutes,   { prefix: '/avaliacoes' })
app.register(chatRoutes,     { prefix: '/chat' })
app.register(trackingRoutes, { prefix: '/rastreamento' })
app.register(adminRoutes,    { prefix: '/admin' })

// Hook de idempotência — salva resposta após cada request
// que enviou o header Idempotency-Key
app.addHook('onSend', saveIdempotencyResponse)

// ---- Health check ----
app.get('/health', async () => ({
  status: 'ok',
  app: 'Muvv Rotas API',
  version: '1.0.0',
  timestamp: new Date().toISOString()
}))

// ---- Start ----
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`\n🚀 Muvv Rotas API rodando em http://localhost:${port}\n`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
