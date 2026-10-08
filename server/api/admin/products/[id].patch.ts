import { z } from 'zod'

const statuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const

const schema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  sku: z.string().trim().max(40).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  price: z.number().positive().max(1000000).optional(),
  ingredients: z.string().trim().max(2000).optional(),
  status: z.enum(statuses).optional()
}).refine(body => Object.keys(body).length > 0, { message: 'Nothing to update.' })

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'product.update')
    const body = await readValid(event, schema)
    const id = getRouterParam(event, 'id')
    const current = await prisma.product.findFirst({ where: { id, deletedAt: null } })
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Product not found.' })
    const categoryId = body.categoryId ?? current.categoryId
    const category = await prisma.category.findFirst({ where: { id: categoryId, deletedAt: null } })
    if (!category) throw createError({ statusCode: 422, statusMessage: 'Choose a category.' })
    const sku = body.sku === undefined
      ? undefined
      : await resolveSku({
          sku: body.sku,
          categoryName: category.name,
          productName: body.name ?? current.name,
          exceptId: current.id
        })
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        sku,
        description: body.description,
        categoryId: body.categoryId,
        price: body.price,
        ingredientList: body.ingredients,
        status: body.status
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'PRODUCT_UPDATED',
      entity: 'product',
      entityId: product.id,
      before: { name: current.name, status: current.status },
      after: { name: product.name, status: product.status }
    })
    return ok({ id: product.id })
  } catch (error) {
    publicError(error)
  }
})
