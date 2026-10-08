import { z } from 'zod'
import { slugify } from '~~/shared/domain/slug'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'category.create')
    const body = await readValid(event, schema)
    const base = slugify(body.name)
    let slug = base
    for (let attempt = 2; attempt < 50; attempt += 1) {
      const existing = await prisma.category.findUnique({ where: { slug } })
      if (!existing) break
      slug = `${base}-${attempt}`
    }
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        sortOrder: body.sortOrder ?? 0
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'CATEGORY_CREATED',
      entity: 'category',
      entityId: category.id,
      after: { name: category.name }
    })
    return ok({ id: category.id })
  } catch (error) {
    publicError(error)
  }
})
