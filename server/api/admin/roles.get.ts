import { ROLE_PERMISSIONS } from '~~/shared/domain/rbac'

export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'user.read')
    const roles = await prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' }
    })
    return ok(roles.map(role => ({
      key: role.key,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(item => item.permission.key),
      defaults: ROLE_PERMISSIONS[role.key]
    })))
  } catch (error) {
    publicError(error)
  }
})
