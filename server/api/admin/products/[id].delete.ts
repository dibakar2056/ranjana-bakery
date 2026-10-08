export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'product.delete')
    const id = getRouterParam(event, 'id')
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null } })
    if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
    const stamp = Date.now().toString(36)
    await prisma.product.update({
      where: { id: product.id },
      data: {
        deletedAt: new Date(),
        status: 'ARCHIVED',
        sku: `del-${stamp}`.slice(0, 40),
        slug: `deleted-${stamp}`
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PRODUCT_DELETED',
      entity: 'product',
      entityId: product.id,
      before: { name: product.name, sku: product.sku }
    })
    return ok({ deleted: true })
  } catch (error) {
    publicError(error)
  }
})
