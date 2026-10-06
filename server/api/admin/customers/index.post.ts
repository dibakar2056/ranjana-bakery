import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferences: z.string().max(500).optional(),
  marketingConsent: z.boolean().optional(),
  address: z.object({
    line1: z.string().trim().min(3).max(160),
    line2: z.string().trim().max(160).optional(),
    city: z.string().trim().min(2).max(80)
  }).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'customer.create')
    const body = await readValid(event, schema)
    const customer = await prisma.customer.create({
      data: {
        name: body.name,
        email: body.email?.toLowerCase(),
        phone: body.phone,
        birthday: body.birthday ? new Date(body.birthday) : undefined,
        preferences: body.preferences,
        marketingConsent: body.marketingConsent ?? false,
        addresses: body.address ? { create: { ...body.address, isDefault: true } } : undefined,
        loyalty: { create: {} }
      }
    })
    await writeAudit(event, {
      actorId: actor.id,
      action: 'USER_CREATED',
      entity: 'customer',
      entityId: customer.id,
      after: { name: customer.name }
    })
    return ok({ id: customer.id })
  } catch (error) {
    publicError(error)
  }
})
