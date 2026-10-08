export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'category.update')
    const id = getRouterParam(event, 'id')
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, imageKey: true }
    })
    if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found.' })
    await prisma.category.update({
      where: { id: category.id },
      data: { imageKey: null, imageUrl: null }
    })
    if (category.imageKey) await removeStoredObject(category.imageKey)
    await writeAudit(event, {
      actorId: actor.id,
      action: 'CATEGORY_UPDATED',
      entity: 'category',
      entityId: category.id,
      after: { image: false }
    })
    return ok({ id: category.id })
  } catch (error) {
    publicError(error)
  }
})
