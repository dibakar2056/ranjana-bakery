import type { Prisma } from '@prisma/client'
import { roundMoney } from '~~/server/utils/orders'

export const promotionTypes = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY'] as const
export type PromotionTypeName = (typeof promotionTypes)[number]

const dayPattern = /^\d{4}-\d{2}-\d{2}$/

export function asPromotionType(value: string): PromotionTypeName {
  if (value === 'PERCENTAGE' || value === 'FIXED_AMOUNT' || value === 'FREE_DELIVERY') return value
  throw createError({ statusCode: 422, statusMessage: 'Choose a promotion type.' })
}

export function promotionAmount(type: PromotionTypeName, value: number) {
  if (type === 'FREE_DELIVERY') return 0
  const amount = roundMoney(value)
  if (type === 'PERCENTAGE') {
    if (amount <= 0 || amount > 100) throw createError({ statusCode: 422, statusMessage: 'Enter a percentage from 1 to 100.' })
    return amount
  }
  if (amount <= 0) throw createError({ statusCode: 422, statusMessage: 'Enter an amount greater than zero.' })
  return amount
}

export function promotionWindow(startsOn: string, endsOn: string) {
  if (!dayPattern.test(startsOn) || !dayPattern.test(endsOn)) {
    throw createError({ statusCode: 422, statusMessage: 'Choose a start and end date.' })
  }
  const startsAt = new Date(`${startsOn}T00:00:00.000Z`)
  const endsAt = new Date(`${endsOn}T23:59:59.999Z`)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt < startsAt) {
    throw createError({ statusCode: 422, statusMessage: 'The end date has to be on or after the start date.' })
  }
  return { startsAt, endsAt }
}

export function couponCode(code: string) {
  const normalized = code.trim().toUpperCase()
  if (!/^[A-Z0-9]{3,20}$/.test(normalized)) {
    throw createError({ statusCode: 422, statusMessage: 'Use 3 to 20 letters or numbers for the code.' })
  }
  return normalized
}

export function dayKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function uniqueIds(ids: string[] | undefined) {
  return [...new Set(ids ?? [])]
}

export async function promotionScope(type: PromotionTypeName, productIds: string[], categoryIds: string[]) {
  if (type === 'FREE_DELIVERY' && (productIds.length || categoryIds.length)) {
    throw createError({ statusCode: 422, statusMessage: 'Free delivery applies to the whole order.' })
  }
  if (productIds.length && categoryIds.length) {
    throw createError({ statusCode: 422, statusMessage: 'Choose products or categories.' })
  }
  if (productIds.length) {
    const found = await prisma.product.count({ where: { id: { in: productIds }, deletedAt: null, status: 'ACTIVE' } })
    if (found !== productIds.length) throw createError({ statusCode: 422, statusMessage: 'Choose an active product.' })
  }
  if (categoryIds.length) {
    const found = await prisma.category.count({ where: { id: { in: categoryIds }, deletedAt: null, isActive: true } })
    if (found !== categoryIds.length) throw createError({ statusCode: 422, statusMessage: 'Choose an active category.' })
  }
  return { productIds, categoryIds }
}

export async function savePromotionScope(tx: Prisma.TransactionClient, promotionId: string, productIds: string[], categoryIds: string[]) {
  await tx.promotionProduct.deleteMany({ where: { promotionId } })
  await tx.promotionCategory.deleteMany({ where: { promotionId } })
  if (productIds.length) {
    await tx.promotionProduct.createMany({ data: productIds.map(productId => ({ promotionId, productId })) })
  }
  if (categoryIds.length) {
    await tx.promotionCategory.createMany({ data: categoryIds.map(categoryId => ({ promotionId, categoryId })) })
  }
}
