export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'promotion.manage')
    const id = getRouterParam(event, 'id')
    const promotion = await prisma.promotion.findFirst({ where: { id, deletedAt: null } })
    if (!promotion) throw createError({ statusCode: 404, statusMessage: 'Promotion not found.' })
    const removedAt = new Date()
    const coupons = await prisma.coupon.findMany({ where: { promotionId: promotion.id, deletedAt: null } })
    await prisma.$transaction([
      ...coupons.map(coupon => prisma.coupon.update({
        where: { id: coupon.id },
        data: { deletedAt: removedAt, active: false, code: `deleted-${coupon.id}` }
      })),
      prisma.promotion.update({
        where: { id: promotion.id },
        data: { deletedAt: removedAt, active: false }
      })
    ])
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PROMOTION_DELETED',
      entity: 'promotion',
      entityId: promotion.id,
      before: { name: promotion.name }
    })
    return ok({ deleted: true })
  } catch (error) {
    publicError(error)
  }
})
