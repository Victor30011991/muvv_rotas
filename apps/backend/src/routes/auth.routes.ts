// ================================================
// MUVV ROTAS — Rotas de autenticação
// POST /auth/cadastro
// POST /auth/login
// POST /auth/refresh
// POST /auth/logout
// ================================================

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'

export async function authRoutes(app: FastifyInstance) {

  // ---- CADASTRO ----
  app.post('/cadastro', async (request, reply) => {
    const schema = z.object({
      name:  z.string().min(2, 'Nome muito curto'),
      email: z.string().email('Email inválido'),
      phone: z.string().min(10, 'Telefone inválido'),
      password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
      role: z.enum(['DRIVER', 'SHIPPER']),
      cpf: z.string().optional()
    })

    const result = schema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({
        error: 'Dados inválidos',
        details: result.error.flatten().fieldErrors
      })
    }

    const { name, email, phone, password, role, cpf } = result.data

    // Verifica se já existe
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    })

    if (existingUser) {
      return reply.status(409).send({
        error: 'Email ou telefone já cadastrado'
      })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Cria o usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        cpf,
        password: hashedPassword,
        role,
        // Cria carteira para motoristas automaticamente
        wallet: role === 'DRIVER' ? { create: {} } : undefined,
        // Cria perfil de motorista automaticamente
        driverProfile: role === 'DRIVER' ? { create: {} } : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true
      }
    })

    // Gera tokens
    const accessToken = app.jwt.sign(
      { sub: user.id, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' }
    )

    return reply.status(201).send({
      message: 'Cadastro realizado com sucesso',
      user,
      accessToken
    })
  })


  // ---- LOGIN ----
  app.post('/login', async (request, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    })

    const result = schema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({ error: 'Dados inválidos' })
    }

    const { email, password } = result.data

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        password: true,
        avatarUrl: true
      }
    })

    if (!user) {
      return reply.status(401).send({ error: 'Email ou senha incorretos' })
    }

    if (user.status === 'BLOCKED') {
      return reply.status(403).send({ error: 'Conta bloqueada. Entre em contato com o suporte.' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return reply.status(401).send({ error: 'Email ou senha incorretos' })
    }

    // Gera access token
    const accessToken = app.jwt.sign(
      { sub: user.id, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' }
    )

    // Gera refresh token
    const refreshToken = app.jwt.sign(
      { sub: user.id },
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d' }
    )

    // Salva refresh token no banco
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt
      }
    })

    const { password: _, ...userWithoutPassword } = user

    return reply.send({
      user: userWithoutPassword,
      accessToken,
      refreshToken
    })
  })


  // ---- REFRESH TOKEN ----
  app.post('/refresh', async (request, reply) => {
    const schema = z.object({ refreshToken: z.string() })
    const result = schema.safeParse(request.body)

    if (!result.success) {
      return reply.status(400).send({ error: 'Refresh token obrigatório' })
    }

    const { refreshToken } = result.data

    // Verifica no banco
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    })

    if (!stored || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Token inválido ou expirado' })
    }

    // Gera novo access token
    const accessToken = app.jwt.sign(
      { sub: stored.user.id, role: stored.user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' }
    )

    return reply.send({ accessToken })
  })


  // ---- LOGOUT ----
  app.delete('/logout', async (request, reply) => {
    const schema = z.object({ refreshToken: z.string() })
    const result = schema.safeParse(request.body)

    if (result.success) {
      await prisma.refreshToken.deleteMany({
        where: { token: result.data.refreshToken }
      })
    }

    return reply.send({ message: 'Logout realizado' })
  })
}
