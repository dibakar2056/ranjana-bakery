import { PrismaClient } from '@prisma/client'
import { hash } from '@node-rs/argon2'
import { PERMISSION_DESCRIPTIONS, PERMISSIONS } from '../shared/domain/permissions'
import { ROLE_PERMISSIONS, type RoleKey } from '../shared/domain/rbac'
import { validatePassword, DEFAULT_PASSWORD_POLICY } from '../shared/domain/password'

const prisma = new PrismaClient()

const ROLE_NAMES: Record<RoleKey, string> = {
  SUPER_ADMIN: 'Super admin',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  USER: 'Customer'
}

async function main() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] }
    })
  }
  for (const roleKey of Object.keys(ROLE_PERMISSIONS) as RoleKey[]) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { name: ROLE_NAMES[roleKey] },
      create: { key: roleKey, name: ROLE_NAMES[roleKey], description: ROLE_NAMES[roleKey] }
    })
    const permissions = await prisma.permission.findMany({ where: { key: { in: ROLE_PERMISSIONS[roleKey] } } })
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.rolePermission.createMany({
      data: permissions.map(permission => ({ roleId: role.id, permissionId: permission.id }))
    })
  }

  const username = process.env.SEED_ADMIN_USERNAME
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!username || !email || !password) {
    console.log('Skipped super admin seed. Set SEED_ADMIN_USERNAME, SEED_ADMIN_EMAIL, and SEED_ADMIN_PASSWORD.')
    return
  }
  const errors = validatePassword(password, DEFAULT_PASSWORD_POLICY, { username, email })
  if (errors.length) throw new Error(errors.join(' '))
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return
  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'SUPER_ADMIN' } })
  const pepper = process.env.PASSWORD_PEPPER
  await prisma.user.create({
    data: {
      username,
      email: email.toLowerCase(),
      displayName: 'Super admin',
      passwordHash: await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
        secret: pepper ? Buffer.from(pepper) : undefined
      }),
      status: 'ACTIVE',
      passwordChangeRequired: false,
      roles: { create: { roleId: role.id } }
    }
  })
}

main().finally(async () => {
  await prisma.$disconnect()
})
