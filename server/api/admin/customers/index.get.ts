export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'customer.read')
    const query = listQuery(event, ['createdAt', 'name'])
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { phone: { contains: query.search, mode: 'insensitive' as const } }
          ]
        }
        : {}),
      ...(query.status ? { status: query.status } : {})
    }
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { loyalty: true, _count: { select: { orders: true } } },
        orderBy: { [query.sort]: query.dir },
        skip: query.skip,
        take: query.pageSize
      }),
      prisma.customer.count({ where })
    ])
    return ok(rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      marketingConsent: row.marketingConsent,
      orders: row._count.orders,
      loyaltyPoints: row.loyalty?.balance ?? 0,
      createdAt: row.createdAt
    })), pageMeta(query.page, query.pageSize, total))
  } catch (error) {
    publicError(error)
  }
})
