import type { RoleKey } from '~~/shared/domain/rbac'

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event)
    const canWrite = actor.permissions.includes('user.create') || actor.permissions.includes('user.update')
    if (!canWrite) throw createError({ statusCode: 403, statusMessage: 'You do not have access to this action.' })
    const id = getRouterParam(event, 'id')
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, imageKey: true, roles: { select: { role: { select: { key: true } } } } }
    })
    if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found.' })
    assertCanManage(actor.roles, user.roles.map(item => item.role.key) as RoleKey[])
    const parts = await readMultipartFormData(event)
    const file = parts?.find(part => part.name === 'image' && part.data?.length)
    if (!file) throw createError({ statusCode: 422, statusMessage: 'Choose an image.' })
    const type = imageType(file.data)
    if (!type) throw createError({ statusCode: 422, statusMessage: 'Use a JPG, PNG, or WebP image under 2 MB.' })
    const stored = await storeImage('users', user.id, file.data, type)
    await prisma.user.update({
      where: { id: user.id },
      data: { imageKey: stored.key, imageUrl: stored.url }
    })
    if (user.imageKey) await removeStoredObject(user.imageKey)
    await writeAudit(event, {
      actorId: actor.id,
      action: 'USER_UPDATED',
      entity: 'user',
      entityId: user.id,
      after: { image: true }
    })
    return ok({ url: stored.url })
  } catch (error) {
    publicError(error)
  }
})
