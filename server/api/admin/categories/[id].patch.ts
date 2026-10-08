import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional()
}).refine(body => Object.keys(body).length > 0, { message: 'Nothing to update.' })

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'category.update')
    const body = await readValid(event, schema)
    const id = getRouterParam(event, 'id')
    const current = await prisma.category.findFirst({ where: { id, deletedAt: null } })
    if (!current) throw createError({ statusCode: 404, statusMessage: 'Category not found.' })
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        sortOrder: body.sortOrder,
        isActive: body.isActive
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'CATEGORY_UPDATED',
      entity: 'category',
      entityId: category.id,
      before: { name: current.name, isActive: current.isActive },
      after: { name: category.name, isActive: category.isActive }
    })
    return ok({ id: category.id })
  } catch (error) {
    publicError(error)
  }
})
