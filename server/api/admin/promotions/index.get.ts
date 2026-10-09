export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'promotion.read')
    const query = listQuery(event, ['createdAt', 'name', 'startsAt'])
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { coupons: { some: { deletedAt: null, code: { contains: query.search, mode: 'insensitive' as const } } } }
            ]
          }
        : {})
    }
    const [rows, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        include: {
          coupons: { where: { deletedAt: null }, take: 1, orderBy: { createdAt: 'asc' } },
          products: { include: { product: { select: { id: true, name: true } } } },
          categories: { include: { category: { select: { id: true, name: true } } } }
        },
        orderBy: { [query.sort]: query.dir },
        skip: query.skip,
        take: query.pageSize
      }),
      prisma.promotion.count({ where })
    ])
    return ok(rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      value: row.value.toString(),
      code: row.coupons[0]?.code ?? null,
      minimumOrder: row.minimumOrder.toString(),
      usageLimit: row.usageLimit,
      usageCount: row.usageCount,
      active: row.active,
      startsOn: dayKey(row.startsAt),
      endsOn: dayKey(row.endsAt),
      products: row.products.map(item => ({ id: item.product.id, name: item.product.name })),
      categories: row.categories.map(item => ({ id: item.category.id, name: item.category.name }))
    })), pageMeta(query.page, query.pageSize, total))
  } catch (error) {
    publicError(error)
  }
})
