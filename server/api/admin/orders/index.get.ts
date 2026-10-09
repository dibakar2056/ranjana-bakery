import { orderStatuses } from '~~/server/utils/orders'

function knownStatus(value: string) {
  return orderStatuses.find(status => status === value)
}

export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'order.read')
    const query = listQuery(event, ['createdAt', 'orderNumber', 'total'])
    const status = knownStatus(query.status)
    const where = {
      ...(status ? { status } : {}),
      ...(query.search
        ? {
            OR: [
              { orderNumber: { contains: query.search, mode: 'insensitive' as const } },
              { customer: { name: { contains: query.search, mode: 'insensitive' as const } } }
            ]
          }
        : {})
    }
    const [rows, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          _count: { select: { items: true } }
        },
        orderBy: { [query.sort]: query.dir },
        skip: query.skip,
        take: query.pageSize
      }),
      prisma.order.count({ where })
    ])
    return ok(rows.map(row => ({
      id: row.id,
      orderNumber: row.orderNumber,
      customer: row.customer.name,
      items: row._count.items,
      total: row.total.toString(),
      status: row.status,
      paymentStatus: row.paymentStatus,
      fulfillment: row.fulfillment,
      createdAt: row.createdAt
    })), pageMeta(query.page, query.pageSize, total))
  } catch (error) {
    publicError(error)
  }
})
