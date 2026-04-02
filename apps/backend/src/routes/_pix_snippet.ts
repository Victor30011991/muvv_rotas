// ================================================
// Adicionar no driver.routes.ts — PUT /motoristas/pix
// ================================================

// PUT /motoristas/pix
// app.put('/pix', { preHandler: [authenticate] }, async (request, reply) => {
//   const schema = z.object({
//     pixKey:     z.string().min(3),
//     pixKeyType: z.enum(['cpf', 'telefone', 'email', 'aleatoria'])
//   })
//   const result = schema.safeParse(request.body)
//   if (!result.success) return reply.status(400).send({ error: 'Chave PIX inválida' })
//   const userId = (request.user as any).sub
//   await prisma.driverProfile.update({
//     where: { userId },
//     data: { pixKey: result.data.pixKey, pixKeyType: result.data.pixKeyType }
//   })
//   return reply.send({ message: 'Chave PIX salva com sucesso' })
// })
