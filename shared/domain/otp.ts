export type OtpPolicy = {
  expiryMinutes: number
  resendCooldownSeconds: number
  maxResendsPerHour: number
  maxDailySends: number
  maxVerificationAttempts: number
  length: number
}

export const DEFAULT_OTP_POLICY: OtpPolicy = {
  expiryMinutes: 10,
  resendCooldownSeconds: 60,
  maxResendsPerHour: 3,
  maxDailySends: 8,
  maxVerificationAttempts: 5,
  length: 6
}

export function canSendOtp(input: {
  lastSentAt: Date | null
  sendsThisHour: number
  sendsToday: number
  policy: OtpPolicy
  now: Date
}) {
  if (input.lastSentAt) {
    const elapsed = input.now.getTime() - input.lastSentAt.getTime()
    if (elapsed < input.policy.resendCooldownSeconds * 1000) {
      return { ok: false as const, reason: 'cooldown' as const }
    }
  }
  if (input.sendsThisHour >= input.policy.maxResendsPerHour) {
    return { ok: false as const, reason: 'hour' as const }
  }
  if (input.sendsToday >= input.policy.maxDailySends) {
    return { ok: false as const, reason: 'day' as const }
  }
  return { ok: true as const }
}

export function otpVerifyState(input: {
  attemptCount: number
  maxAttempts: number
  expiresAt: Date
  consumed: boolean
  now: Date
}) {
  if (input.consumed) return 'consumed' as const
  if (input.now.getTime() > input.expiresAt.getTime()) return 'expired' as const
  if (input.attemptCount >= input.maxAttempts) return 'attempts' as const
  return 'ok' as const
}
