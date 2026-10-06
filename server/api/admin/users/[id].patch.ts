import { z } from 'zod'
import type { RoleKey } from '~~/shared/domain/rbac'

const schema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  email: z.string().trim().max(160).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'USER']).optional(),
  status: z.enum(['INVITED', 'ACTIVE', 'DISABLED']).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'user.update')
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    const target = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { roles: { include: { role: true } } }
    })
    if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    const targetRoles = target.roles.map(item => item.role.key) as RoleKey[]
    assertCanManage(actor.roles, targetRoles)
    const body = await readValid(event, schema)
    if (body.role) assertCanAssign(actor.roles, body.role)
    if (body.status === 'DISABLED' && target.id === actor.id) {
      throw createError({ statusCode: 422, statusMessage: 'You cannot disable your own account.' })
    }
    if (body.role) {
      const role = await prisma.role.findUniqueOrThrow({ where: { key: body.role } })
      await prisma.userRole.deleteMany({ where: { userId: target.id } })
      await prisma.userRole.create({ data: { userId: target.id, roleId: role.id } })
    }
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        displayName: body.displayName,
        username: body.username,
        email: body.email?.toLowerCase(),
        phone: body.phone === undefined ? undefined : body.phone,
        status: body.status,
        userVersion: body.role || body.status ? { increment: 1 } : undefined
      },
      include: { roles: { include: { role: true } } }
    })
    if (body.role || body.status) await revokeUserSessions(target.id)
    await writeAudit(event, {
      actorId: actor.id,
      action: body.status === 'DISABLED' ? 'USER_DISABLED' : body.role ? 'ROLE_CHANGED' : 'USER_UPDATED',
      entity: 'user',
      entityId: target.id,
      before: { status: target.status, roles: targetRoles },
      after: presentUser(updated)
    })
    return ok(presentUser(updated))
  } catch (error) {
    publicError(error)
  }
})
