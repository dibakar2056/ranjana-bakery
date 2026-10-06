import type { RoleKey } from '~~/shared/domain/rbac'
import { canAssignRole, canManageUser } from '~~/shared/domain/rbac'
import { validatePassword } from '~~/shared/domain/password'

export function presentUser(user: {
  id: string
  username: string
  email: string
  displayName: string
  phone: string | null
  status: string
  userVersion: number
  passwordChangeRequired: boolean
  lastLoginAt: Date | null
  createdAt: Date
  roles: Array<{ role: { key: string } }>
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    phone: user.phone,
    status: user.status,
    userVersion: user.userVersion,
    passwordChangeRequired: user.passwordChangeRequired,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    roles: user.roles.map(item => item.role.key)
  }
}

export function assertCanAssign(actorRoles: RoleKey[], role: RoleKey) {
  if (!canAssignRole(actorRoles, role)) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot assign that role.' })
  }
}

export function assertCanManage(actorRoles: RoleKey[], targetRoles: RoleKey[]) {
  if (!canManageUser(actorRoles, targetRoles)) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot manage this account.' })
  }
}

export async function createManagedUser(event: Parameters<typeof getHeader>[0], actorId: string, actorRoles: RoleKey[], input: {
  username: string
  email: string
  displayName: string
  phone?: string
  role: RoleKey
  status?: 'INVITED' | 'ACTIVE' | 'DISABLED'
}) {
  assertCanAssign(actorRoles, input.role)
  const temporary = temporaryPassword()
  const passwordHash = await hashPassword(temporary)
  const role = await prisma.role.findUnique({ where: { key: input.role } })
  if (!role) throw createError({ statusCode: 422, statusMessage: 'Unknown role.' })
  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      phone: input.phone,
      passwordHash,
      passwordChangeRequired: true,
      status: input.status ?? 'INVITED',
      roles: { create: { roleId: role.id } }
    }
  })
  const token = randomToken()
  await prisma.authToken.create({
    data: {
      userId: user.id,
      purpose: 'ACTIVATION',
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  })
  const sent = await sendTemplate('user.invitation', user.email, {
    name: user.displayName,
    username: user.username,
    temporaryPassword: temporary,
    activationUrl: `${serverEnv().siteUrl}/activate?token=${encodeURIComponent(token)}`
  })
  if (!sent) {
    await prisma.authToken.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
    throw createError({ statusCode: 503, statusMessage: 'The activation email could not be sent. The account was not created.' })
  }
  await writeAudit(event, {
    actorId,
    action: 'USER_CREATED',
    entity: 'user',
    entityId: user.id,
    after: { username: user.username, email: user.email, role: input.role }
  })
  return user
}

export async function replacePassword(userId: string, password: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  const policy = policyFromSettings(await getSettings())
  const errors = validatePassword(password, policy, user)
  if (errors.length) throw createError({ statusCode: 422, statusMessage: errors[0] })
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: policy.historyCount
  })
  if (await passwordReused(password, [user.passwordHash, ...history.map(item => item.passwordHash)])) {
    throw createError({ statusCode: 422, statusMessage: 'Choose a password you have not used recently.' })
  }
  const nextHash = await hashPassword(password)
  await prisma.$transaction([
    prisma.passwordHistory.create({ data: { userId, passwordHash: user.passwordHash } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: nextHash,
        passwordChangeRequired: false,
        status: 'ACTIVE',
        userVersion: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null
      }
    }),
    prisma.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.authToken.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } })
  ])
}
