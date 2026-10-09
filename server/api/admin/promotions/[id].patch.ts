import { z } from 'zod'
import { asPromotionType, couponCode, dayKey, promotionAmount, promotionScope, promotionTypes, promotionWindow, savePromotionScope, uniqueIds } from '~~/server/utils/promotions'
import { roundMoney } from '~~/server/utils/orders'

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  type: z.enum(promotionTypes).optional(),
  value: z.number().min(0).max(1000000).optional(),
  code: z.string().trim().min(3).max(20).optional(),
  startsOn: z.string().trim().optional(),
  endsOn: z.string().trim().optional(),
  minimumOrder: z.number().min(0).max(1000000).optional(),
  usageLimit: z.number().int().min(1).max(1000000).nullable().optional(),
  active: z.boolean().optional(),
  productIds: z.array(z.string().uuid()).max(50).optional(),
  categoryIds: z.array(z.string().uuid()).max(20).optional()
}).refine(body => Object.keys(body).length > 0, { message: 'Nothing to update.' })

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'promotion.manage')
    const body = await readValid(event, schema)
    const id = getRouterParam(event, 'id')
    const current = await prisma.promotion.findFirst({
      where: { id, deletedAt: null },
      include: { coupons: { where: { deletedAt: null }, take: 1, orderBy: { createdAt: 'asc' } } }
    })
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Promotion not found.' })
    const nextType = body.type || body.value !== undefined ? asPromotionType(body.type ?? current.type) : undefined
    const window = body.startsOn || body.endsOn
      ? promotionWindow(body.startsOn ?? dayKey(current.startsAt), body.endsOn ?? dayKey(current.endsAt))
      : null
    const code = body.code === undefined ? undefined : couponCode(body.code)
    const scope = body.productIds || body.categoryIds
      ? await promotionScope(asPromotionType(body.type ?? current.type), uniqueIds(body.productIds), uniqueIds(body.categoryIds))
      : null
    const promotion = await prisma.$transaction(async (tx) => {
      const updated = await tx.promotion.update({
        where: { id: current.id },
        data: {
          name: body.name,
          ...(nextType ? { type: nextType, value: promotionAmount(nextType, body.value ?? Number(current.value)) } : {}),
          ...(window ?? {}),
          ...(body.minimumOrder !== undefined ? { minimumOrder: roundMoney(body.minimumOrder) } : {}),
          ...(body.usageLimit !== undefined ? { usageLimit: body.usageLimit } : {}),
          ...(body.active !== undefined ? { active: body.active } : {})
        }
      })
      if (code) {
        const coupon = current.coupons[0]
        if (coupon) await tx.coupon.update({ where: { id: coupon.id }, data: { code } })
        else await tx.coupon.create({ data: { code, promotionId: current.id } })
      }
      if (scope) await savePromotionScope(tx, current.id, scope.productIds, scope.categoryIds)
      return updated
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PROMOTION_UPDATED',
      entity: 'promotion',
      entityId: promotion.id,
      before: { name: current.name, active: current.active },
      after: { name: promotion.name, active: promotion.active }
    })
    return ok({ id: promotion.id })
  } catch (error) {
    publicError(error)
  }
})
