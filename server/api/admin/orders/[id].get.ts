export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'order.read')
    const id = getRouterParam(event, 'id')
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            addresses: { orderBy: { isDefault: 'desc' }, take: 1 }
          }
        },
        items: { orderBy: { name: 'asc' } },
        history: { orderBy: { createdAt: 'asc' } },
        payments: { orderBy: { createdAt: 'asc' } }
      }
    })
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
    return ok({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillment: order.fulfillment,
      scheduledAt: order.scheduledAt,
      notes: order.notes,
      image: order.imageUrl,
      total: order.total.toString(),
      advance: order.advanceAmount?.toString() ?? '0',
      createdAt: order.createdAt,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
        address: order.customer.addresses[0]
          ? `${order.customer.addresses[0].line1}, ${order.customer.addresses[0].city}`
          : null
      },
      items: order.items.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString()
      })),
      history: order.history.map(entry => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        createdAt: entry.createdAt
      })),
      payments: order.payments.map(payment => ({
        id: payment.id,
        method: payment.method,
        status: payment.status,
        amount: payment.amount.toString()
      }))
    })
  } catch (error) {
    publicError(error)
  }
})
