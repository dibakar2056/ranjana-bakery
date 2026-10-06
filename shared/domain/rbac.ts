import { PERMISSIONS, type PermissionKey } from './permissions'

export type RoleKey = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'USER'

const STAFF_PERMISSIONS: PermissionKey[] = [
  'product.read',
  'category.read',
  'order.read',
  'order.create',
  'order.update',
  'customer.read',
  'customer.create',
  'customer.update',
  'review.read',
  'review.moderate',
  'inventory.read',
  'inventory.update',
  'supplier.read',
  'purchase_order.read',
  'promotion.read',
  'loyalty.read',
  'notification.read',
  'custom_cake.read',
  'custom_cake.manage'
]

const ADMIN_EXCLUDED: PermissionKey[] = [
  'user.delete',
  'role.manage',
  'settings.security'
]

export const ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: PERMISSIONS.filter(permission => !ADMIN_EXCLUDED.includes(permission)),
  STAFF: STAFF_PERMISSIONS,
  USER: []
}

export function hasPermission(granted: readonly string[], required: string) {
  return granted.includes(required)
}

export function canAssignRole(actorRoles: readonly RoleKey[], targetRole: RoleKey) {
  if (actorRoles.includes('SUPER_ADMIN')) return true
  if (actorRoles.includes('ADMIN')) return targetRole === 'STAFF' || targetRole === 'USER'
  return false
}

export function canManageUser(actorRoles: readonly RoleKey[], targetRoles: readonly RoleKey[]) {
  if (targetRoles.includes('SUPER_ADMIN')) return actorRoles.includes('SUPER_ADMIN')
  if (targetRoles.includes('ADMIN')) return actorRoles.includes('SUPER_ADMIN')
  if (actorRoles.includes('SUPER_ADMIN')) return true
  if (actorRoles.includes('ADMIN')) {
    return targetRoles.every(role => role === 'STAFF' || role === 'USER')
  }
  return false
}

export function canDeleteUser(actorRoles: readonly RoleKey[], targetRoles: readonly RoleKey[]) {
  if (targetRoles.includes('SUPER_ADMIN')) return actorRoles.includes('SUPER_ADMIN')
  return actorRoles.includes('SUPER_ADMIN') || actorRoles.includes('ADMIN')
}

export function isStaffPortalRole(roles: readonly RoleKey[]) {
  return roles.some(role => role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF')
}

export function highestRole(roles: readonly RoleKey[]): RoleKey | null {
  const order: RoleKey[] = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'USER']
  return order.find(role => roles.includes(role)) ?? null
}
