import { classifyCustomer } from '~~/shared/domain/segments'

const openStatuses = ['CANCELLED', 'REFUNDED'] as const

export async function customerDetail(id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      addresses: true,
      notes: { include: { author: { select: { displayName: true } } }, orderBy: { createdAt: 'desc' } },
      loyalty: true
    }
  })
  if (!customer) return null
  const orders = await prisma.order.findMany({
    where: { customerId: id, status: { notIn: [...openStatuses] } },
    include: { items: { include: { product: { select: { name: true, category: { select: { name: true } } } } } } },
    orderBy: { createdAt: 'asc' }
  })
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total), 0)
  const recentSince = new Date(Date.now() - 90 * 86400000)
  const recentOrderCount = orders.filter(order => order.createdAt >= recentSince).length
  const products = new Map<string, { name: string, count: number }>()
  const categories = new Map<string, number>()
  for (const order of orders) {
    for (const item of order.items) {
      const name = item.product?.name ?? item.name
      const key = item.productId ?? name
      products.set(key, { name, count: (products.get(key)?.count ?? 0) + item.quantity })
      const category = item.product?.category.name
      if (category) categories.set(category, (categories.get(category) ?? 0) + item.quantity)
    }
  }
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    birthday: customer.birthday,
    preferences: customer.preferences,
    marketingConsent: customer.marketingConsent,
    status: customer.status,
    createdAt: customer.createdAt,
    addresses: customer.addresses,
    notes: customer.notes.map(note => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt,
      author: note.author?.displayName ?? 'Team'
    })),
    analytics: {
      totalOrders: orders.length,
      totalSpending: totalSpent,
      averageOrderValue: orders.length ? totalSpent / orders.length : 0,
      firstOrder: orders[0]?.createdAt ?? null,
      lastOrder: orders.at(-1)?.createdAt ?? null,
      favoriteProducts: [...products.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      favoriteCategories: [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count })),
      loyaltyPoints: customer.loyalty?.balance ?? 0,
      customerLifetimeValue: totalSpent
    },
    segments: classifyCustomer({
      createdAt: customer.createdAt,
      orderCount: orders.length,
      totalSpent,
      lastOrderAt: orders.at(-1)?.createdAt ?? null,
      recentOrderCount,
      birthday: customer.birthday,
      now: new Date()
    }),
    recentOrders: [...orders].reverse().slice(0, 8).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt
    }))
  }
}
