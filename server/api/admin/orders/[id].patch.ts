import { z } from 'zod'
import { orderStatuses, paymentStatuses, roundMoney } from '~~/server/utils/orders'

const schema = z.object({
  status: z.enum(orderStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  advance: z.number().min(0).max(1000000).optional()
}).refine(body => body.status !== undefined || body.paymentStatus !== undefined || body.advance !== undefined)

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'order.update')
    const id = getRouterParam(event, 'id')
    const body = await readValid(event, schema)
    if (body.status === 'CANCELLED' && !actor.permissions.includes('order.cancel')) {
      throw createError({ statusCode: 403, statusMessage: 'You do not have access to this action.' })
    }
    const order = await prisma.order.findUnique({ where: { id }, include: { payments: true } })
    if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found.' })
    const advance = body.advance === undefined ? undefined : roundMoney(body.advance)
    if (advance !== undefined && advance > Number(order.total)) {
      throw createError({ statusCode: 422, statusMessage: 'Advance cannot be more than the total.' })
    }
    const covered = advance !== undefined && advance >= Number(order.total) && Number(order.total) > 0
    const statusChanged = body.status !== undefined && body.status !== order.status
    const paymentChanged = covered || (body.paymentStatus !== undefined && body.paymentStatus !== order.paymentStatus)
    const nextPayment = covered ? 'PAID' : body.paymentStatus
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          ...(statusChanged ? { status: body.status } : {}),
          ...(paymentChanged && nextPayment ? { paymentStatus: nextPayment } : {}),
          ...(advance !== undefined ? { advanceAmount: advance } : {})
        }
      })
      if (statusChanged && body.status) {
        await tx.orderStatusHistory.create({
          data: { orderId: order.id, fromStatus: order.status, toStatus: body.status, actorId: actor.id }
        })
      }
      if (paymentChanged && body.paymentStatus === 'PAID' && !order.payments.some(payment => payment.status === 'PAID')) {
        await tx.payment.create({
          data: { orderId: order.id, method: 'CASH', status: 'PAID', amount: order.total }
        })
      }
      if (paymentChanged && body.paymentStatus === 'REFUNDED') {
        await tx.payment.updateMany({
          where: { orderId: order.id, status: 'PAID' },
          data: { status: 'REFUNDED' }
        })
      }
    })
    await cacheDel('dashboard:summary')
    await writeAudit(event, {
      actorId: actor.id,
      action: 'ORDER_UPDATED',
      entity: 'order',
      entityId: order.id,
      before: { status: order.status, paymentStatus: order.paymentStatus },
      after: { status: body.status ?? order.status, paymentStatus: body.paymentStatus ?? order.paymentStatus }
    })
    return ok({ updated: true })
  } catch (error) {
    publicError(error)
  }
})
