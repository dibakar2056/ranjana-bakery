import { z } from 'zod'
import { validatePassword } from '~~/shared/domain/password'

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().max(160).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  password: z.string().min(1).max(128)
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readValid(event, schema)
    const meta = requestMeta(event)
    await rateLimit(`register:ip:${meta.ip ?? 'unknown'}`, 5, 15 * 60)
    const email = body.email.toLowerCase()
    const errors = validatePassword(body.password, policyFromSettings(await getSettings()), {
      username: body.username,
      email
    })
    if (errors.length) throw createError({ statusCode: 422, statusMessage: errors[0] })
    const role = await prisma.role.findUnique({ where: { key: 'USER' } })
    if (!role) throw createError({ statusCode: 500, statusMessage: 'Something went wrong. Please try again.' })
    const user = await prisma.user.create({
      data: {
        username: body.username,
        email,
        displayName: body.name,
        passwordHash: await hashPassword(body.password),
        status: 'ACTIVE',
        roles: { create: { roleId: role.id } },
        customer: { create: { name: body.name, email, loyalty: { create: {} } } }
      }
    })
    await startSession(event, user, 'FULL')
    await writeAudit(event, {
      actorId: user.id,
      action: 'USER_CREATED',
      entity: 'user',
      entityId: user.id,
      after: { username: user.username, role: 'USER' }
    })
    return ok({ id: user.id })
  } catch (error) {
    publicError(error)
  }
})
