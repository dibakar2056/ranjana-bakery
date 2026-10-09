export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event)
    const canWrite = actor.permissions.includes('order.create') || actor.permissions.includes('order.update')
    if (!canWrite) throw createError({ statusCode: 403, statusMessage: 'You do not have access to this action.' })
    const id = getRouterParam(event, 'id')
    const order = await prisma.order.findUnique({ where: { id }, select: { id: true, imageKey: true } })
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
    const parts = await readMultipartFormData(event)
    const file = parts?.find(part => part.name === 'image' && part.data?.length)
    if (!file) throw createError({ statusCode: 422, statusMessage: 'Choose an image.' })
    const type = imageType(file.data)
    if (!type) throw createError({ statusCode: 422, statusMessage: 'Use a JPG, PNG, or WebP image under 2 MB.' })
    const stored = await storeImage('orders', order.id, file.data, type)
    await prisma.order.update({
      where: { id: order.id },
      data: { imageKey: stored.key, imageUrl: stored.url }
    })
    if (order.imageKey) await removeStoredObject(order.imageKey)
    await writeAudit(event, {
      actorId: actor.id,
      action: 'ORDER_UPDATED',
      entity: 'order',
      entityId: order.id,
      after: { image: true }
    })
    return ok({ url: stored.url })
  } catch (error) {
    publicError(error)
  }
})
