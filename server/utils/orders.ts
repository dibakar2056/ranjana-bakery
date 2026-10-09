import type { Prisma } from '@prisma/client'

export const orderStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const
export const paymentStatuses = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

export async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const dateKey = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const seq = await tx.orderSequence.upsert({
    where: { dateKey },
    create: { dateKey, last: 1 },
    update: { last: { increment: 1 } }
  })
  return `RB-${dateKey}-${String(seq.last).padStart(3, '0')}`
}
