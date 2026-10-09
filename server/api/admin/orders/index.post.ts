import { z } from 'zod'
import { nextOrderNumber, roundMoney } from '~~/server/utils/orders'

const schema = z.object({
  customerId: z.string().uuid().optional(),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(30).optional(),
    address: z.object({
      line1: z.string().trim().min(3).max(160),
      city: z.string().trim().min(2).max(80)
    })
  }).optional(),
  fulfillment: z.enum(['PICKUP', 'DELIVERY']),
  scheduledAt: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID']).optional(),
  advance: z.number().min(0).max(1000000).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99)
  })).min(1).max(20)
}).refine(body => Boolean(body.customerId) !== Boolean(body.customer))

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'order.create')
    const body = await readValid(event, schema)
    if (body.customer && !actor.permissions.includes('customer.create')) {
      throw createError({ statusCode: 403, statusMessage: 'You do not have access to this action.' })
    }
    const existing = body.customerId
      ? await prisma.customer.findFirst({ where: { id: body.customerId, deletedAt: null, status: 'ACTIVE' } })
      : null
    if (!existing && !body.customer) throw createError({ statusCode: 422, statusMessage: 'Choose a customer.' })
    let scheduledAt: Date | null = null
    if (body.scheduledAt) {
      scheduledAt = new Date(body.scheduledAt)
      if (Number.isNaN(scheduledAt.getTime())) throw createError({ statusCode: 422, statusMessage: 'Choose a valid time.' })
    }
    const quantities = new Map<string, number>()
    for (const item of body.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity)
    const products = await prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] }, deletedAt: null, status: 'ACTIVE' }
    })
    if (products.length !== quantities.size) throw createError({ statusCode: 422, statusMessage: 'Choose an active product.' })
    const lines = products.map((product) => {
      const quantity = quantities.get(product.id) ?? 0
      const unitPrice = roundMoney(Number(product.price))
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        lineTotal: roundMoney(unitPrice * quantity),
        costSnapshot: product.costPrice === null ? null : Number(product.costPrice)
      }
    })
    const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.lineTotal, 0))
    const advance = roundMoney(body.advance ?? 0)
    if (advance > subtotal) throw createError({ statusCode: 422, statusMessage: 'Advance cannot be more than the total.' })
    const paymentStatus = advance >= subtotal && subtotal > 0 ? 'PAID' : (body.paymentStatus ?? 'PENDING')
    const paidNow = paymentStatus === 'PAID' ? subtotal : advance
    const order = await prisma.$transaction(async (tx) => {
      const customer = existing ?? await tx.customer.create({
        data: {
          name: body.customer!.name,
          phone: body.customer!.phone,
          addresses: { create: { ...body.customer!.address, isDefault: true } },
          loyalty: { create: {} }
        }
      })
      const orderNumber = await nextOrderNumber(tx)
      return tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          fulfillment: body.fulfillment,
          scheduledAt,
          notes: body.notes || null,
          subtotal,
          total: subtotal,
          advanceAmount: advance,
          paymentStatus,
          pricingSnapshot: { currency: 'NPR', lines },
          items: {
            create: lines.map(line => ({
              productId: line.productId,
              name: line.name,
              sku: line.sku,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
              costSnapshot: line.costSnapshot
            }))
          },
          history: {
            create: { toStatus: 'PENDING', actorId: actor.id }
          },
          ...(paidNow > 0
            ? { payments: { create: { method: 'CASH', status: 'PAID', amount: paidNow } } }
            : {})
        }
      })
    })
    await cacheDel('dashboard:summary')
    if (!existing) {
      await writeAudit(event, {
        actorId: actor.id,
        action: 'USER_CREATED',
        entity: 'customer',
        entityId: order.customerId,
        after: { name: body.customer?.name }
      })
    }
    await writeAudit(event, {
      actorId: actor.id,
      action: 'ORDER_CREATED',
      entity: 'order',
      entityId: order.id,
      after: { orderNumber: order.orderNumber, total: subtotal }
    })
    return ok({ id: order.id })
  } catch (error) {
    publicError(error)
  }
})
