import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  preferences: z.string().max(500).nullable().optional(),
  marketingConsent: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  note: z.string().trim().min(1).max(1000).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'customer.update')
    const id = getRouterParam(event, 'id')
    if (!id) throw createError({ statusCode: 404, statusMessage: 'Customer not found.' })
    const body = await readValid(event, schema)
    await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone === undefined ? undefined : body.phone,
        preferences: body.preferences === undefined ? undefined : body.preferences,
        marketingConsent: body.marketingConsent,
        status: body.status,
        notes: body.note ? { create: { body: body.note, authorId: actor.id } } : undefined
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'USER_UPDATED',
      entity: 'customer',
      entityId: id,
      after: { name: body.name, status: body.status }
    })
    return ok(await customerDetail(id))
  } catch (error) {
    publicError(error)
  }
})
