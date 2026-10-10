export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug') ?? ''
    const row = await prisma.product.findFirst({
      where: { slug, deletedAt: null, status: 'ACTIVE' },
      include: {
        category: { select: { name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } }
      }
    })
    if (!row) throw createError({ statusCode: 404, statusMessage: 'This product is not available.' })
    return ok({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: row.price.toString(),
      salePrice: row.salePrice?.toString() ?? null,
      image: row.media[0]?.url ?? null,
      category: row.category.name,
      categorySlug: row.category.slug,
      ingredients: row.ingredientList,
      allergens: row.allergens
    })
  } catch (error) {
    publicError(error)
  }
})
