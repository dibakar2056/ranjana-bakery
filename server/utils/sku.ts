function part(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export async function resolveSku(input: {
  sku?: string
  categoryName: string
  productName: string
  exceptId?: string
}) {
  const provided = input.sku?.trim() ?? ''
  if (provided.length === 1) {
    throw createError({ statusCode: 422, statusMessage: 'SKU must be at least 2 characters.' })
  }
  if (provided) {
    const existing = await prisma.product.findUnique({ where: { sku: provided } })
    if (existing && existing.id !== input.exceptId) {
      throw createError({ statusCode: 422, statusMessage: 'That SKU is already used.' })
    }
    return provided
  }
  const base = `${(part(input.categoryName) || 'item').slice(0, 12)}-${(part(input.productName) || 'product').slice(0, 18)}`
  for (let number = 1; number < 1000; number += 1) {
    const suffix = `-${number}`
    const sku = `${base.slice(0, 40 - suffix.length)}${suffix}`
    const existing = await prisma.product.findUnique({ where: { sku } })
    if (!existing || existing.id === input.exceptId) return sku
  }
  throw createError({ statusCode: 422, statusMessage: 'Could not create a SKU.' })
}
