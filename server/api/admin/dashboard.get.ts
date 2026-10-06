export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'order.read')
    const cached = await cacheGet<Record<string, unknown>>('dashboard:summary')
    if (cached) return ok(cached)
    const currency = String((await getSettings())['store.currency'] ?? 'NPR')
    const now = new Date()
    const startToday = new Date(now)
    startToday.setHours(0, 0, 0, 0)
    const startWeek = new Date(startToday)
    startWeek.setDate(startWeek.getDate() - 6)
    const startMonth = new Date(startToday)
    startMonth.setDate(startMonth.getDate() - 29)
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startMonth }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
      select: { total: true, createdAt: true, status: true, customerId: true }
    })
    const sum = (rows: typeof orders) => rows.reduce((total, order) => total + Number(order.total), 0)
    const byDay = new Map<string, number>()
    for (let index = 0; index < 30; index += 1) {
      const day = new Date(startMonth)
      day.setDate(startMonth.getDate() + index)
      byDay.set(day.toISOString().slice(0, 10), 0)
    }
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10)
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(order.total))
    }
    const [customerCount, newCustomers, pendingOrders, completedOrders, pendingReviews, cakeRequests, lowStock, upcoming] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null, createdAt: { gte: startMonth } } }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] } } }),
      prisma.order.count({ where: { status: { in: ['COMPLETED', 'DELIVERED'] } } }),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.customCakeRequest.count({ where: { status: { in: ['REQUESTED', 'REVIEWING', 'QUOTED'] } } }),
      prisma.ingredient.findMany({ where: { deletedAt: null }, orderBy: { onHand: 'asc' }, take: 12 }),
      prisma.order.findMany({
        where: { scheduledAt: { gte: now }, status: { notIn: ['CANCELLED', 'COMPLETED', 'REFUNDED'] } },
        orderBy: { scheduledAt: 'asc' },
        take: 6,
        include: { customer: { select: { name: true } } }
      })
    ])
    const returning = await prisma.order.groupBy({
      by: ['customerId'],
      where: { status: { not: 'CANCELLED' } },
      _count: { _all: true }
    })
    const summary = {
      currency,
      revenue: {
        today: sum(orders.filter(order => order.createdAt >= startToday)),
        week: sum(orders.filter(order => order.createdAt >= startWeek)),
        month: sum(orders)
      },
      orders: { pending: pendingOrders, completed: completedOrders, month: orders.length },
      customers: {
        total: customerCount,
        newer: newCustomers,
        returning: returning.filter(row => row._count._all >= 2).length
      },
      averageOrderValue: orders.length ? sum(orders) / orders.length : 0,
      lowStock: lowStock
        .filter(item => Number(item.onHand) <= Number(item.reorderPoint))
        .map(item => ({ id: item.id, name: item.name, onHand: Number(item.onHand) })),
      pendingReviews,
      customCakeRequests: cakeRequests,
      upcoming: upcoming.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        scheduledAt: order.scheduledAt,
        customer: order.customer.name,
        status: order.status
      })),
      revenueSeries: [...byDay.entries()].map(([date, total]) => ({ date, total }))
    }
    await cacheSet('dashboard:summary', summary, 60)
    return ok(summary)
  } catch (error) {
    publicError(error)
  }
})
