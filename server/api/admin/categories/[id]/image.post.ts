export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event)
    const canWrite = actor.permissions.includes('category.create') || actor.permissions.includes('category.update')
    if (!canWrite) throw createError({ statusCode: 403, statusMessage: 'You do not have access to this action.' })
    const id = getRouterParam(event, 'id')
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, imageKey: true }
    })
    if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found.' })
    const parts = await readMultipartFormData(event)
    const file = parts?.find(part => part.name === 'image' && part.data?.length)
    if (!file) throw createError({ statusCode: 422, statusMessage: 'Choose an image.' })
    const type = imageType(file.data)
    if (!type) throw createError({ statusCode: 422, statusMessage: 'Use a JPG, PNG, or WebP image under 2 MB.' })
    const stored = await storeImage('categories', category.id, file.data, type)
    await prisma.category.update({
      where: { id: category.id },
      data: { imageKey: stored.key, imageUrl: stored.url }
    })
    if (category.imageKey) await removeStoredObject(category.imageKey)
    await writeAudit(event, {
      actorId: actor.id,
      action: 'CATEGORY_UPDATED',
      entity: 'category',
      entityId: category.id,
      after: { image: true }
    })
    return ok({ url: stored.url })
  } catch (error) {
    publicError(error)
  }
})
