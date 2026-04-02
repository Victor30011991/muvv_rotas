// ================================================
// MUVV ROTAS — Middleware de autenticação
// ================================================

import { FastifyRequest, FastifyReply } from 'fastify'

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}

export async function authenticateAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify()
    const user = request.user as { role: string }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Acesso restrito' })
    }
  } catch {
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}
