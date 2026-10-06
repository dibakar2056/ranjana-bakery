import type { RoleKey } from '~~/shared/domain/rbac'
import { canDeleteUser } from '~~/shared/domain/rbac'

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'user.update')
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    if (id === actor.id) {
      throw createError({ statusCode: 422, statusMessage: 'You cannot delete your own account.' })
    }
    const target = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } }
    })
    if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    const targetRoles = target.roles.map(item => item.role.key) as RoleKey[]
    if (!canDeleteUser(actor.roles, targetRoles)) {
      throw createError({ statusCode: 403, statusMessage: 'You cannot delete this account.' })
    }
    if (targetRoles.includes('SUPER_ADMIN')) {
      const remaining = await prisma.user.count({
        where: {
          deletedAt: null,
          id: { not: target.id },
          roles: { some: { role: { key: 'SUPER_ADMIN' } } }
        }
      })
      if (remaining < 1) {
        throw createError({ statusCode: 422, statusMessage: 'You cannot delete the last super admin.' })
      }
    }
    const stamp = target.id.replaceAll('-', '')
    await prisma.user.update({
      where: { id: target.id },
      data: {
        deletedAt: new Date(),
        status: 'DISABLED',
        username: `deleted${stamp}`.slice(0, 40),
        email: `deleted.${stamp}@users.invalid`,
        userVersion: { increment: 1 }
      }
    })
    await revokeUserSessions(target.id)
    await writeAudit(event, {
      actorId: actor.id,
      action: 'USER_DELETED',
      entity: 'user',
      entityId: target.id,
      before: { username: target.username, roles: targetRoles }
    })
    return ok({ deleted: true })
  } catch (error) {
    publicError(error)
  }
})
