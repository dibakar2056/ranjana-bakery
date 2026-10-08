export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'category.read')
    const query = listQuery(event, ['sortOrder', 'name', 'createdAt'])
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            name: { contains: query.search, mode: 'insensitive' as const }
          }
        : {})
    }
    const [rows, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: { _count: { select: { products: { where: { deletedAt: null } } } } },
        orderBy: { [query.sort]: query.dir },
        skip: query.skip,
        take: query.pageSize
      }),
      prisma.category.count({ where })
    ])
    return ok(rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      image: row.imageUrl,
      products: row._count.products
    })), pageMeta(query.page, query.pageSize, total))
  } catch (error) {
    publicError(error)
  }
})
