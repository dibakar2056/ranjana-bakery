import { z } from 'zod'
import { isStaffPortalRole, type RoleKey } from '~~/shared/domain/rbac'

const schema = z.object({
  accessToken: z.string().min(20).max(4096)
})

type GoogleProfile = {
  aud?: string
  sub?: string
  user_id?: string
  email?: string
  email_verified?: boolean | string
  name?: string
}

function usernameFromEmail(email: string) {
  const local = email.split('@')[0] ?? ''
  const cleaned = local.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24)
  return cleaned.length >= 3 ? cleaned : `baker${cleaned}`
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readValid(event, schema)
    const clientId = serverEnv().googleClientId
    if (!clientId) throw createError({ statusCode: 503, statusMessage: 'Google sign-in is not configured.' })
    const meta = requestMeta(event)
    await rateLimit(`google:ip:${meta.ip ?? 'unknown'}`, 10, 15 * 60)
    const profile = await $fetch<GoogleProfile>('https://oauth2.googleapis.com/tokeninfo', {
      query: { access_token: body.accessToken }
    }).catch(() => null)
    const email = profile?.email?.toLowerCase()
    const verified = profile?.email_verified === true || profile?.email_verified === 'true'
    const subject = profile?.sub || profile?.user_id
    if (!email || !verified || !subject || profile?.aud !== clientId) {
      throw createError({ statusCode: 401, statusMessage: 'Google sign-in could not be verified.' })
    }
    const name = profile.name?.trim() || email.split('@')[0] || 'Customer'
    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } }, customer: true }
    })
    if (user?.deletedAt) throw createError({ statusCode: 403, statusMessage: 'This account is disabled.' })
    if (user?.status === 'DISABLED') throw createError({ statusCode: 403, statusMessage: 'This account is disabled.' })
    const roles = user?.roles.map(item => item.role.key as RoleKey) ?? []
    if (user && isStaffPortalRole(roles)) {
      throw createError({ statusCode: 403, statusMessage: 'This sign-in is for customer accounts.' })
    }
    if (!user) {
      const role = await prisma.role.findUnique({ where: { key: 'USER' } })
      if (!role) throw createError({ statusCode: 500, statusMessage: 'Something went wrong. Please try again.' })
      const base = usernameFromEmail(email)
      let username = base
      let extra = 1
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${base.slice(0, 20)}${extra}`
        extra += 1
      }
      user = await prisma.user.create({
        data: {
          username,
          email,
          displayName: name.slice(0, 80),
          passwordHash: await hashPassword(randomToken()),
          status: 'ACTIVE',
          roles: { create: { roleId: role.id } },
          customer: { create: { name: name.slice(0, 80), email, loyalty: { create: {} } } }
        },
        include: { roles: { include: { role: true } }, customer: true }
      })
      await writeAudit(event, {
        actorId: user.id,
        action: 'USER_CREATED',
        entity: 'user',
        entityId: user.id,
        after: { username: user.username, role: 'USER' }
      })
    } else if (!user.customer) {
      await prisma.customer.create({
        data: { userId: user.id, name: user.displayName, email: user.email, loyalty: { create: {} } }
      })
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), status: 'ACTIVE' }
    })
    await startSession(event, user, 'FULL')
    logEvent('info', 'Google sign-in accepted', { userId: user.id })
    return ok({ id: user.id })
  } catch (error) {
    publicError(error)
  }
})
