export type PasswordPolicy = {
  minLength: number
  requireUpper: boolean
  requireLower: boolean
  requireNumber: boolean
  requireSpecial: boolean
  historyCount: number
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireNumber: true,
  requireSpecial: true,
  historyCount: 5
}

export function validatePassword(
  password: string,
  policy: PasswordPolicy,
  identity: { username?: string | null, email?: string | null }
) {
  const errors: string[] = []
  if (password.length < policy.minLength) {
    errors.push(`Use at least ${policy.minLength} characters`)
  }
  if (password.length > 128) {
    errors.push('Use at most 128 characters')
  }
  if (policy.requireUpper && !/[A-Z]/.test(password)) {
    errors.push('Include an uppercase letter')
  }
  if (policy.requireLower && !/[a-z]/.test(password)) {
    errors.push('Include a lowercase letter')
  }
  if (policy.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Include a number')
  }
  if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Include a special character')
  }
  const lower = password.toLowerCase()
  const username = identity.username?.trim().toLowerCase()
  if (username && username.length >= 3 && lower.includes(username)) {
    errors.push('Password cannot contain your username')
  }
  const emailLocal = identity.email?.split('@')[0]?.trim().toLowerCase()
  if (emailLocal && emailLocal.length >= 3 && lower.includes(emailLocal)) {
    errors.push('Password cannot contain your email')
  }
  return errors
}

export type LoginDecision
  = | { result: 'ok' }
    | { result: 'invalid', failedLoginCount: number, lockedUntil: Date | null }
    | { result: 'locked' }
    | { result: 'disabled' }
    | { result: 'activation_required' }

export function evaluateLogin(input: {
  passwordOk: boolean
  status: 'INVITED' | 'ACTIVE' | 'DISABLED'
  failedLoginCount: number
  lockedUntil: Date | null
  now: Date
  maxAttempts: number
  lockoutMinutes: number
}): LoginDecision {
  if (input.lockedUntil && input.lockedUntil > input.now) {
    return { result: 'locked' }
  }
  if (!input.passwordOk) {
    const failedLoginCount = input.failedLoginCount + 1
    const lockedUntil = failedLoginCount >= input.maxAttempts
      ? new Date(input.now.getTime() + input.lockoutMinutes * 60 * 1000)
      : null
    return { result: 'invalid', failedLoginCount, lockedUntil }
  }
  if (input.status === 'DISABLED') return { result: 'disabled' }
  if (input.status === 'INVITED') return { result: 'activation_required' }
  return { result: 'ok' }
}

export function isSessionVersionValid(sessionVersion: number, userVersion: number) {
  return sessionVersion === userVersion
}
