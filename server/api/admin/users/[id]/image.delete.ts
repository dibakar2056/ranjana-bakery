import type { RoleKey } from '~~/shared/domain/rbac'

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'user.update')
    const id = getRouterParam(event, 'id')
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, imageKey: true, roles: { select: { role: { select: { key: true } } } } }
    })
    if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    assertCanManage(actor.roles, user.roles.map(item => item.role.key) as RoleKey[])
    await prisma.user.update({
      where: { id: user.id },
      data: { imageKey: null, imageUrl: null }
    })
    if (user.imageKey) await removeStoredObject(user.imageKey)
    await writeAudit(event, {
      actorId: actor.id,
      action: 'USER_UPDATED',
      entity: 'user',
      entityId: user.id,
      after: { image: false }
    })
    return ok({ id: user.id })
  } catch (error) {
    publicError(error)
  }
})
