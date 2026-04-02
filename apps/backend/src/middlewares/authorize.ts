// ================================================
// MUVV ROTAS — Middleware de autorização por role
// ================================================

import { FastifyRequest, FastifyReply } from 'fastify'

export function authorize(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { sub: string; role: string }

    if (!roles.includes(user.role)) {
      return reply.status(403).send({
        error: 'Acesso negado para este perfil'
      })
    }
  }
}
