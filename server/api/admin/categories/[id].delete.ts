export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'category.delete')
    const id = getRouterParam(event, 'id')
    const category = await prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { products: { where: { deletedAt: null } } } } }
    })
    if (!category) throw createError({ statusCode: 404, statusMessage: 'Category not found.' })
    if (category._count.products > 0) {
      throw createError({ statusCode: 422, statusMessage: 'Move or delete the products in this category first.' })
    }
    const stamp = Date.now().toString(36)
    await prisma.category.update({
      where: { id: category.id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        slug: `deleted-${stamp}`
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'CATEGORY_DELETED',
      entity: 'category',
      entityId: category.id,
      before: { name: category.name }
    })
    return ok({ deleted: true })
  } catch (error) {
    publicError(error)
  }
})
