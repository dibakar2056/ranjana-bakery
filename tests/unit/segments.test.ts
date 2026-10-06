import { describe, expect, it } from 'vitest'
import { classifyCustomer } from '../../shared/domain/segments'

const now = new Date('2026-10-05T12:00:00Z')

describe('customer segments', () => {
  it('marks a recent first-time customer as new', () => {
    expect(classifyCustomer({
      createdAt: new Date('2026-10-01T00:00:00Z'),
      orderCount: 1,
      totalSpent: 500,
      lastOrderAt: new Date('2026-10-02T00:00:00Z'),
      recentOrderCount: 1,
      birthday: null,
      now
    })).toContain('New')
  })

  it('marks repeat and high spend customers', () => {
    const segments = classifyCustomer({
      createdAt: new Date('2025-01-01T00:00:00Z'),
      orderCount: 6,
      totalSpent: 25000,
      lastOrderAt: new Date('2026-10-01T00:00:00Z'),
      recentOrderCount: 4,
      birthday: new Date('1990-10-10T00:00:00Z'),
      now
    })
    expect(segments).toEqual(expect.arrayContaining(['Returning', 'VIP', 'High Value', 'Frequent Buyer', 'Birthday Upcoming']))
  })
})
