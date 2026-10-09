import { z } from 'zod'
import { couponCode, promotionAmount, promotionScope, promotionTypes, promotionWindow, savePromotionScope, uniqueIds } from '~~/server/utils/promotions'
import { roundMoney } from '~~/server/utils/orders'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(promotionTypes),
  value: z.number().min(0).max(1000000),
  code: z.string().trim().min(3).max(20),
  startsOn: z.string().trim(),
  endsOn: z.string().trim(),
  minimumOrder: z.number().min(0).max(1000000).optional(),
  usageLimit: z.number().int().min(1).max(1000000).nullable().optional(),
  productIds: z.array(z.string().uuid()).max(50).optional(),
  categoryIds: z.array(z.string().uuid()).max(20).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'promotion.manage')
    const body = await readValid(event, schema)
    const code = couponCode(body.code)
    const window = promotionWindow(body.startsOn, body.endsOn)
    const scope = await promotionScope(body.type, uniqueIds(body.productIds), uniqueIds(body.categoryIds))
    const promotion = await prisma.$transaction(async (tx) => {
      const created = await tx.promotion.create({
        data: {
          name: body.name,
          type: body.type,
          value: promotionAmount(body.type, body.value),
          minimumOrder: roundMoney(body.minimumOrder ?? 0),
          usageLimit: body.usageLimit ?? null,
          ...window
        }
      })
      await tx.coupon.create({ data: { code, promotionId: created.id } })
      await savePromotionScope(tx, created.id, scope.productIds, scope.categoryIds)
      return created
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PROMOTION_CREATED',
      entity: 'promotion',
      entityId: promotion.id,
      after: { name: promotion.name, code }
    })
    return ok({ id: promotion.id })
  } catch (error) {
    publicError(error)
  }
})
