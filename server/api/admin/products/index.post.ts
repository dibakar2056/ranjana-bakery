import { z } from 'zod'
import { slugify } from '~~/shared/domain/slug'

const statuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().max(40).optional(),
  description: z.string().trim().min(1).max(2000),
  categoryId: z.string().uuid(),
  price: z.number().positive().max(1000000),
  ingredients: z.string().trim().max(2000).optional(),
  status: z.enum(statuses).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'product.create')
    const body = await readValid(event, schema)
    const category = await prisma.category.findFirst({ where: { id: body.categoryId, deletedAt: null } })
    if (!category) throw createError({ statusCode: 422, statusMessage: 'Choose a category.' })
    const sku = await resolveSku({ sku: body.sku, categoryName: category.name, productName: body.name })
    const base = slugify(body.name)
    let slug = base
    for (let attempt = 2; attempt < 50; attempt += 1) {
      const existing = await prisma.product.findUnique({ where: { slug } })
      if (!existing) break
      slug = `${base}-${attempt}`
    }
    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku,
        slug,
        description: body.description,
        categoryId: body.categoryId,
        price: body.price,
        ingredientList: body.ingredients ?? '',
        status: body.status ?? 'DRAFT'
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PRODUCT_CREATED',
      entity: 'product',
      entityId: product.id,
      after: { name: product.name, sku: product.sku }
    })
    return ok({ id: product.id })
  } catch (error) {
    publicError(error)
  }
})
