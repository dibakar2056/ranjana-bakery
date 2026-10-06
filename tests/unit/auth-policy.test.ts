import { describe, expect, it } from 'vitest'
import { evaluateLogin, isSessionVersionValid, validatePassword } from '../../shared/domain/password'
import { canAssignRole, canDeleteUser, canManageUser } from '../../shared/domain/rbac'
import { canSendOtp, DEFAULT_OTP_POLICY, otpVerifyState } from '../../shared/domain/otp'
import { parseSetting } from '../../shared/domain/settings'

describe('password policy', () => {
  const policy = {
    minLength: 12,
    requireUpper: true,
    requireLower: true,
    requireNumber: true,
    requireSpecial: true,
    historyCount: 5
  }

  it('accepts a strong password', () => {
    expect(validatePassword('Bakery-Night-19', policy, { username: 'admin', email: 'a@example.com' })).toEqual([])
  })

  it('rejects a short password and identity words', () => {
    expect(validatePassword('short', policy, { username: 'admin' }).length).toBeGreaterThan(0)
    expect(validatePassword('Admin-password-1!', policy, { username: 'admin' })).toContain('Password cannot contain your username')
  })
})

describe('login decisions', () => {
  const now = new Date('2026-10-05T12:00:00Z')

  it('locks after the attempt limit', () => {
    const decision = evaluateLogin({
      passwordOk: false,
      status: 'ACTIVE',
      failedLoginCount: 4,
      lockedUntil: null,
      now,
      maxAttempts: 5,
      lockoutMinutes: 15
    })
    expect(decision.result).toBe('invalid')
    if (decision.result === 'invalid') expect(decision.lockedUntil).not.toBeNull()
  })

  it('requires activation for invited accounts', () => {
    expect(evaluateLogin({
      passwordOk: true,
      status: 'INVITED',
      failedLoginCount: 0,
      lockedUntil: null,
      now,
      maxAttempts: 5,
      lockoutMinutes: 15
    }).result).toBe('activation_required')
  })

  it('invalidates a session when the user version changes', () => {
    expect(isSessionVersionValid(2, 2)).toBe(true)
    expect(isSessionVersionValid(1, 2)).toBe(false)
  })
})

describe('authorization boundaries', () => {
  it('lets an admin manage staff but not a super admin', () => {
    expect(canAssignRole(['ADMIN'], 'STAFF')).toBe(true)
    expect(canAssignRole(['ADMIN'], 'SUPER_ADMIN')).toBe(false)
    expect(canManageUser(['ADMIN'], ['SUPER_ADMIN'])).toBe(false)
    expect(canManageUser(['STAFF'], ['USER'])).toBe(false)
    expect(canDeleteUser(['ADMIN'], ['ADMIN'])).toBe(true)
    expect(canDeleteUser(['ADMIN'], ['SUPER_ADMIN'])).toBe(false)
    expect(canDeleteUser(['SUPER_ADMIN'], ['ADMIN'])).toBe(true)
  })
})

describe('otp limits', () => {
  it('blocks a resend during cooldown and an expired code', () => {
    const now = new Date('2026-10-05T12:00:00Z')
    expect(canSendOtp({
      lastSentAt: new Date(now.getTime() - 10_000),
      sendsThisHour: 0,
      sendsToday: 0,
      policy: DEFAULT_OTP_POLICY,
      now
    }).ok).toBe(false)
    expect(otpVerifyState({
      attemptCount: 5,
      maxAttempts: 5,
      expiresAt: new Date(now.getTime() + 60_000),
      consumed: false,
      now
    })).toBe('attempts')
  })
})

describe('security setting bounds', () => {
  it('refuses a password length below 12', () => {
    expect(() => parseSetting('security.password_min_length', 8)).toThrow()
    expect(parseSetting('otp.expiry_minutes', 10)).toBe(10)
  })
})
