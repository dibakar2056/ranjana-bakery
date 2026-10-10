export default defineEventHandler(async (event) => {
  try {
    const user = await requireUser(event)
    const customer = await prisma.customer.findFirst({
      where: { userId: user.id, deletedAt: null },
      include: { addresses: { orderBy: { isDefault: 'desc' } }, loyalty: true }
    })
    const orders = customer
      ? await prisma.order.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { orderNumber: true, status: true, total: true, createdAt: true }
        })
      : []
    const address = customer?.addresses[0]
    return ok({
      name: customer?.name ?? user.displayName,
      username: user.username,
      email: customer?.email ?? user.email,
      phone: customer?.phone ?? null,
      birthday: customer?.birthday ? customer.birthday.toISOString().slice(0, 10) : null,
      preferences: customer?.preferences ?? null,
      address: address ? [address.line1, address.line2, address.city].filter(part => part?.trim()).join(', ') : null,
      since: (customer?.createdAt ?? null)?.toISOString() ?? null,
      loyalty: customer?.loyalty?.balance ?? 0,
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total.toString(),
        createdAt: order.createdAt.toISOString()
      }))
    })
  } catch (error) {
    publicError(error)
  }
})
