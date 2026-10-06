export type SegmentName =
  | 'New'
  | 'Returning'
  | 'VIP'
  | 'High Value'
  | 'Inactive'
  | 'Birthday Upcoming'
  | 'Frequent Buyer'

export type SegmentThresholds = {
  vipSpend: number
  highValueSpend: number
  inactiveDays: number
  frequentOrders: number
  newWindowDays: number
  birthdayWindowDays: number
}

export const DEFAULT_SEGMENT_THRESHOLDS: SegmentThresholds = {
  vipSpend: 20000,
  highValueSpend: 10000,
  inactiveDays: 60,
  frequentOrders: 4,
  newWindowDays: 30,
  birthdayWindowDays: 14
}

function daysBetween(later: Date, earlier: Date) {
  return (later.getTime() - earlier.getTime()) / 86400000
}

function birthdayWithin(birthday: Date, now: Date, windowDays: number) {
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  let next = Date.UTC(now.getUTCFullYear(), birthday.getUTCMonth(), birthday.getUTCDate())
  if (next < start) next = Date.UTC(now.getUTCFullYear() + 1, birthday.getUTCMonth(), birthday.getUTCDate())
  return (next - start) / 86400000 <= windowDays
}

export function classifyCustomer(input: {
  createdAt: Date
  orderCount: number
  totalSpent: number
  lastOrderAt: Date | null
  recentOrderCount: number
  birthday: Date | null
  now: Date
  thresholds?: Partial<SegmentThresholds>
}): SegmentName[] {
  const thresholds = { ...DEFAULT_SEGMENT_THRESHOLDS, ...input.thresholds }
  const segments: SegmentName[] = []
  if (input.orderCount <= 1 && daysBetween(input.now, input.createdAt) <= thresholds.newWindowDays) segments.push('New')
  if (input.orderCount >= 2) segments.push('Returning')
  if (input.totalSpent >= thresholds.vipSpend) segments.push('VIP')
  if (input.totalSpent >= thresholds.highValueSpend) segments.push('High Value')
  const anchor = input.lastOrderAt ?? input.createdAt
  if (daysBetween(input.now, anchor) >= thresholds.inactiveDays) segments.push('Inactive')
  if (input.birthday && birthdayWithin(input.birthday, input.now, thresholds.birthdayWindowDays)) segments.push('Birthday Upcoming')
  if (input.recentOrderCount >= thresholds.frequentOrders) segments.push('Frequent Buyer')
  return segments
}
