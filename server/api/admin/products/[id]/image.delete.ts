export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'product.update')
    const id = getRouterParam(event, 'id')
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
    const previous = await prisma.productMedia.findMany({ where: { productId: product.id }, select: { r2Key: true } })
    await prisma.productMedia.deleteMany({ where: { productId: product.id } })
    await Promise.all(previous.map(row => removeStoredObject(row.r2Key)))
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PRODUCT_UPDATED',
      entity: 'product',
      entityId: product.id,
      after: { image: false }
    })
    return ok({ id: product.id })
  } catch (error) {
    publicError(error)
  }
})
