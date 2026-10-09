import { z } from 'zod'
import { isStaffPortalRole, type RoleKey } from '~~/shared/domain/rbac'

const schema = z.object({
  username: z.string().trim().min(1).max(80)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readValid(event, schema)
    const meta = requestMeta(event)
    await rateLimit(`reset:ip:${meta.ip ?? 'unknown'}`, 8, 60 * 60)
    const user = await prisma.user.findUnique({
      where: { username: body.username },
      include: { roles: { include: { role: true } } }
    })
    const staff = Boolean(
      user
      && !user.deletedAt
      && user.status === 'ACTIVE'
      && isStaffPortalRole(user.roles.map(item => item.role.key as RoleKey))
    )
    if (staff && user) {
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
