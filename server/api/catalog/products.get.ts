export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : ''
    const category = typeof query.category === 'string' ? query.category.trim().slice(0, 80) : ''
    const take = Math.max(1, Math.min(24, Number(query.pageSize) || 12))
    const rows = await prisma.product.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        ...(category ? { category: { slug: category, deletedAt: null, isActive: true } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
              ]
            }
          : {})
      },
      include: {
        category: { select: { name: true, slug: true } },
        media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } }
      },
      orderBy: [{ featured: 'desc' }, { name: 'asc' }],
      take
    })
    return ok(rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: row.price.toString(),
      salePrice: row.salePrice?.toString() ?? null,
      image: row.media[0]?.url ?? null,
      category: row.category.name,
      categorySlug: row.category.slug,
      featured: row.featured
    })))
  } catch (error) {
    publicError(error)
  }
})
