const productStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

function money(value: { toString(): string } | null) {
  return value ? value.toString() : null
}

function productStatus(value: string) {
  return productStatuses.find(status => status === value)
}

export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'product.read')
    const query = listQuery(event, ['createdAt', 'name', 'sku'])
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { sku: { contains: query.search, mode: 'insensitive' as const } }
            ]
          }
        : {}),
      ...(productStatus(query.status) ? { status: productStatus(query.status) } : {})
    }
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          media: { orderBy: { sortOrder: 'asc' }, take: 1, select: { url: true } }
        },
        orderBy: { [query.sort]: query.dir },
        skip: query.skip,
        take: query.pageSize
      }),
      prisma.product.count({ where })
    ])
    return ok(rows.map(row => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      price: money(row.price),
      quantity: row.stockQuantity,
      image: row.media[0]?.url ?? null,
      ingredients: row.ingredientList,
      status: row.status
    })), pageMeta(query.page, query.pageSize, total))
  } catch (error) {
    publicError(error)
  }
})
