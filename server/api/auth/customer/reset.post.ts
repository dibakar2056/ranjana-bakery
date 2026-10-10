import { z } from 'zod'
import { isStaffPortalRole, type RoleKey } from '~~/shared/domain/rbac'

const schema = z.object({
  username: z.string().trim().min(1).max(160),
  otp: z.string().trim().regex(/^\d{6,8}$/),
  newPassword: z.string().min(12).max(128)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readValid(event, schema)
    const meta = requestMeta(event)
    await rateLimit(`reset:confirm:${meta.ip ?? 'unknown'}`, 10, 15 * 60)
    const loginId = body.username.trim()
    const user = await prisma.user.findUnique({
      where: loginId.includes('@') ? { email: loginId.toLowerCase() } : { username: loginId },
      include: { roles: { include: { role: true } } }
    })
    const roles = user?.roles.map(item => item.role.key as RoleKey) ?? []
    const customer = Boolean(
      user
      && !user.deletedAt
      && user.status === 'ACTIVE'
      && roles.includes('USER')
      && !isStaffPortalRole(roles)
    )
    if (!customer || !user) throw createError({ statusCode: 400, statusMessage: 'The code is invalid or has expired.' })
    await consumeOtp(event, user.id, 'PASSWORD_RESET', body.otp)
    await replacePassword(user.id, body.newPassword)
    await writeAudit(event, { actorId: user.id, action: 'PASSWORD_RESET', entity: 'user', entityId: user.id })
    return ok({ reset: true })
  } catch (error) {
    publicError(error)
  }
})
