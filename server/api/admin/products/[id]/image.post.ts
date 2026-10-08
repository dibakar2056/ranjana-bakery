export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event)
    const canWrite = actor.permissions.includes('product.create') || actor.permissions.includes('product.update')
    if (!canWrite) throw createError({ statusCode: 403, statusMessage: 'You do not have access to this action.' })
    const id = getRouterParam(event, 'id')
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true } })
    if (!product) throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
    const parts = await readMultipartFormData(event)
    const file = parts?.find(part => part.name === 'image' && part.data?.length)
    if (!file) throw createError({ statusCode: 422, statusMessage: 'Choose an image.' })
    const type = imageType(file.data)
    if (!type) throw createError({ statusCode: 422, statusMessage: 'Use a JPG, PNG, or WebP image under 2 MB.' })
    const stored = await storeImage('products', product.id, file.data, type)
    const previous = await prisma.productMedia.findMany({ where: { productId: product.id }, select: { r2Key: true } })
    await prisma.$transaction([
      prisma.productMedia.deleteMany({ where: { productId: product.id } }),
      prisma.productMedia.create({
        data: { productId: product.id, r2Key: stored.key, url: stored.url, alt: product.name }
      })
    ])
    await Promise.all(previous.map(row => removeStoredObject(row.r2Key)))
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PRODUCT_UPDATED',
      entity: 'product',
      entityId: product.id,
      after: { image: true }
    })
    return ok({ url: stored.url })
  } catch (error) {
    publicError(error)
  }
})
