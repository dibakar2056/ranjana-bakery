import { z } from 'zod'
import { isStaffPortalRole, type RoleKey } from '~~/shared/domain/rbac'

const schema = z.object({
  username: z.string().trim().min(1).max(160)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readValid(event, schema)
    const meta = requestMeta(event)
    await rateLimit(`reset:ip:${meta.ip ?? 'unknown'}`, 8, 60 * 60)
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
    if (customer && user) {
      try {
        await issueOtp(event, user, 'PASSWORD_RESET')
      } catch (error) {
        logEvent('error', 'Password reset email failed', {
          userId: user.id,
          reason: error instanceof Error ? error.name : 'UnknownError'
        })
      }
    }
    return ok({ sent: true })
  } catch (error) {
    publicError(error)
  }
})
