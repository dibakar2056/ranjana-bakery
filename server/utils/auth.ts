import type { RoleKey as PrismaRoleKey, SessionKind, UserStatus } from '@prisma/client'
import { hasPermission, isStaffPortalRole, type RoleKey } from '~~/shared/domain/rbac'
import { evaluateLogin, isSessionVersionValid } from '~~/shared/domain/password'

const COOKIE = 'rb_session'

export type AuthUser = {
  id: string
  username: string
  email: string
  displayName: string
  status: UserStatus
  userVersion: number
  passwordChangeRequired: boolean
  roles: RoleKey[]
  permissions: string[]
  sessionKind: SessionKind
}

const userInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } }
} as const

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge
  }
}

export function toAuthUser(user: {
  id: string
  username: string
  email: string
  displayName: string
  status: UserStatus
  userVersion: number
  passwordChangeRequired: boolean
  roles: Array<{ role: { key: PrismaRoleKey, permissions: Array<{ permission: { key: string } }> } }>
}, sessionKind: SessionKind): AuthUser {
  const roles = user.roles.map(item => item.role.key as RoleKey)
  const permissions = [...new Set(user.roles.flatMap(item => item.role.permissions.map(entry => entry.permission.key)))]
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    userVersion: user.userVersion,
    passwordChangeRequired: user.passwordChangeRequired,
    roles,
    permissions,
    sessionKind
  }
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    permissions: user.permissions,
    passwordChangeRequired: user.passwordChangeRequired
  }
}

export async function startSession(event: Parameters<typeof setCookie>[0], user: { id: string, userVersion: number }, kind: SessionKind) {
  const settings = await getSettings()
  const hours = Number(settings['security.session_hours'] ?? 12)
  const maxAge = kind === 'SETUP' ? 15 * 60 : hours * 60 * 60
  const token = randomToken()
  const meta = requestMeta(event)
  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: sha256(token),
      userVersion: user.userVersion,
      kind,
      expiresAt: new Date(Date.now() + maxAge * 1000),
      ip: meta.ip,
      userAgent: meta.userAgent
    }
  })
  setCookie(event, COOKIE, token, cookieOptions(maxAge))
}

export async function endSession(event: Parameters<typeof getCookie>[0]) {
  const token = getCookie(event, COOKIE)
  if (token) {
    await prisma.userSession.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() }
    })
  }
  deleteCookie(event, COOKIE, cookieOptions(0))
}

export async function revokeUserSessions(userId: string) {
  await prisma.userSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  })
}

export async function getAuthUser(event: Parameters<typeof getCookie>[0]): Promise<AuthUser | null> {
  const token = getCookie(event, COOKIE)
  if (!token) return null
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: userInclude } }
  })
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null
  if (session.user.deletedAt || session.user.status === 'DISABLED') return null
  if (!isSessionVersionValid(session.userVersion, session.user.userVersion)) return null
  if (session.kind === 'FULL' && session.user.passwordChangeRequired) return null
  return toAuthUser(session.user, session.kind)
}

export async function requireUser(event: Parameters<typeof getCookie>[0], permission?: string) {
  const user = await getAuthUser(event)
  if (!user || user.sessionKind !== 'FULL') {
    throw createError({ statusCode: 401, statusMessage: 'Sign in to continue.' })
  }
  ;(event.context as { userId?: string }).userId = user.id
  if (permission && !hasPermission(user.permissions, permission)) {
    throw createError({ statusCode: 403, statusMessage: 'You do not have access to this action.' })
  }
  return user
}

export async function requireSetupUser(event: Parameters<typeof getCookie>[0]) {
  const user = await getAuthUser(event)
  if (!user || user.sessionKind !== 'SETUP') {
    throw createError({ statusCode: 401, statusMessage: 'Activation session expired. Start again.' })
  }
  return user
}

export async function loginWithPassword(event: Parameters<typeof setCookie>[0], username: string, password: string) {
  const meta = requestMeta(event)
  await rateLimit(`login:ip:${meta.ip ?? 'unknown'}`, 20, 15 * 60)
  await rateLimit(`login:user:${username.toLowerCase()}`, 10, 15 * 60)
  const settings = await getSettings()
  const user = await prisma.user.findUnique({ where: { username }, include: userInclude })
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? null)
  if (!user || user.deletedAt) {
    await prisma.loginAttempt.create({ data: { username, success: false, ip: meta.ip } })
    logEvent('warn', 'Sign-in rejected', { username, reason: 'unknown-user' })
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })
  }
  const decision = evaluateLogin({
    passwordOk,
    status: user.status,
    failedLoginCount: user.failedLoginCount,
    lockedUntil: user.lockedUntil,
    now: new Date(),
    maxAttempts: Number(settings['security.max_login_attempts'] ?? 5),
    lockoutMinutes: Number(settings['security.lockout_minutes'] ?? 15)
  })
  if (decision.result === 'locked') {
    await prisma.loginAttempt.create({ data: { username, userId: user.id, success: false, ip: meta.ip } })
    logEvent('warn', 'Sign-in rejected', { username, reason: passwordOk ? 'locked' : 'bad-password' })
    throw createError({
      statusCode: 401,
      statusMessage: passwordOk ? 'This account is temporarily locked.' : 'Invalid username or password.'
    })
  }
  if (decision.result === 'invalid') {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: decision.failedLoginCount, lockedUntil: decision.lockedUntil }
    })
    await prisma.loginAttempt.create({ data: { username, userId: user.id, success: false, ip: meta.ip } })
    logEvent('warn', 'Sign-in rejected', { username, reason: 'bad-password' })
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password.' })
  }
  if (decision.result === 'disabled') {
    logEvent('warn', 'Sign-in rejected', { username, reason: 'disabled' })
    throw createError({ statusCode: 403, statusMessage: 'This account is disabled.' })
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }
  })
  await prisma.loginAttempt.create({ data: { username, userId: user.id, success: true, ip: meta.ip } })
  if (decision.result === 'activation_required' || user.passwordChangeRequired) {
    await startSession(event, user, 'SETUP')
    logEvent('info', 'Sign-in accepted', { username, userId: user.id, session: 'setup' })
    return { activationRequired: true, user: publicUser(toAuthUser(user, 'SETUP')) }
  }
  if (!isStaffPortalRole(user.roles.map(item => item.role.key))) {
    logEvent('warn', 'Sign-in rejected', { username, reason: 'not-staff' })
    throw createError({ statusCode: 403, statusMessage: 'This sign-in is for staff accounts.' })
  }
  await startSession(event, user, 'FULL')
  logEvent('info', 'Sign-in accepted', { username, userId: user.id, session: 'full' })
  return { activationRequired: false, user: publicUser(toAuthUser(user, 'FULL')) }
}
