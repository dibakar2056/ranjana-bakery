export function priceLabel(value: string | number | null | undefined) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return ''
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(amount)
}
