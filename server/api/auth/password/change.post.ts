import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  otp: z.string().trim().regex(/^\d{6,8}$/),
  newPassword: z.string().min(12).max(128)
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event)
    const body = await readValid(event, schema)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } })
    if (!await verifyPassword(body.currentPassword, user.passwordHash)) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })
    }
    await consumeOtp(event, user.id, 'PASSWORD_CHANGE', body.otp)
    await replacePassword(user.id, body.newPassword)
    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
    await startSession(event, refreshed, 'FULL')
    await sendTemplate('password.changed', user.email, { name: user.displayName }).catch(() => false)
    await writeAudit(event, { actorId: user.id, action: 'PASSWORD_CHANGED', entity: 'user', entityId: user.id })
    return ok({ changed: true })
  } catch (error) {
    publicError(error)
  }
})
