import { hash, verify } from '@node-rs/argon2'
import type { PasswordPolicy } from '~~/shared/domain/password'

function options() {
  const pepper = serverEnv().passwordPepper
  return {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    secret: pepper ? Buffer.from(pepper) : undefined
  }
}

let dummyHash: string | null = null

export async function hashPassword(password: string) {
  return hash(password, options())
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    dummyHash ??= await hash('not-a-real-password', options())
    await verify(dummyHash, password, options())
    return false
  }
  try {
    return await verify(passwordHash, password, options())
  } catch {
    return false
  }
}

export async function passwordReused(password: string, hashes: string[]) {
  for (const existing of hashes) {
    if (await verifyPassword(password, existing)) return true
  }
  return false
}

export function policyFromSettings(settings: Record<string, unknown>): PasswordPolicy {
  return {
    minLength: Number(settings['security.password_min_length'] ?? 12),
    requireUpper: Boolean(settings['security.password_require_upper'] ?? true),
    requireLower: Boolean(settings['security.password_require_lower'] ?? true),
    requireNumber: Boolean(settings['security.password_require_number'] ?? true),
    requireSpecial: Boolean(settings['security.password_require_special'] ?? true),
    historyCount: Number(settings['security.password_history'] ?? 5)
  }
}
