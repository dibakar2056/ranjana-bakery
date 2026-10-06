import { z } from 'zod'
import type { RoleKey } from '~~/shared/domain/rbac'

const email = z.string().trim().max(160).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email')

const schema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  email,
  displayName: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'USER']),
  status: z.enum(['INVITED', 'ACTIVE', 'DISABLED']).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const actor = await requireUser(event, 'user.create')
    const body = await readValid(event, schema)
    const user = await createManagedUser(event, actor.id, actor.roles, { ...body, role: body.role as RoleKey })
    const created = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: { roles: { include: { role: true } } }
    })
    return ok(presentUser(created))
  } catch (error) {
    publicError(error)
  }
})
