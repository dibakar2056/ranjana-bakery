export function toCents(major: number | string): number {
  const value = typeof major === 'string' ? Number(major) : major
  if (!Number.isFinite(value)) {
    throw new Error('Invalid amount')
  }
  return Math.round(value * 100)
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100
}

export function assertNonNegativeCents(cents: number) {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error('Amount must be a non-negative integer number of cents')
  }
}
