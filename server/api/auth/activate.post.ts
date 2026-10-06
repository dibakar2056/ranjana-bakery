import { z } from 'zod'

const startSchema = z.object({
  token: z.string().min(20).max(200),
  temporaryPassword: z.string().min(8).max(200)
})

const completeSchema = z.object({
  otp: z.string().trim().regex(/^\d{6,8}$/),
  newPassword: z.string().min(12).max(128),
  confirmPassword: z.string().min(12).max(128)
})

export default defineEventHandler(async (event) => {
  try {
    await rateLimit(`activate:${clientIp(event) ?? 'unknown'}`, 10, 60 * 60)
    const body = await readBody(event)
    if (body && typeof body === 'object' && 'token' in body) {
      const parsed = startSchema.parse(body)
      const record = await prisma.authToken.findUnique({
        where: { tokenHash: sha256(parsed.token) },
        include: { user: true }
      })
      if (!record || record.purpose !== 'ACTIVATION' || record.consumedAt || record.expiresAt <= new Date()) {
        throw createError({ statusCode: 400, statusMessage: 'This activation link is invalid or expired.' })
      }
      if (!await verifyPassword(parsed.temporaryPassword, record.user.passwordHash)) {
        throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })
      }
      await startSession(event, record.user, 'SETUP')
      await issueOtp(event, record.user, 'ACTIVATION')
      return ok({ otpSent: true })
    }
    const parsed = completeSchema.parse(body)
    if (parsed.newPassword !== parsed.confirmPassword) {
      throw createError({ statusCode: 422, statusMessage: 'Passwords do not match.' })
    }
    const session = await requireSetupUser(event)
    await consumeOtp(event, session.id, 'ACTIVATION', parsed.otp)
    await replacePassword(session.id, parsed.newPassword)
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } })
    await endSession(event)
    await writeAudit(event, {
      actorId: user.id,
      action: 'PASSWORD_CHANGED',
      entity: 'user',
      entityId: user.id,
      after: { activation: true }
    })
    return ok({ activated: true })
  } catch (error) {
    publicError(error)
  }
})
