import type { OtpPurpose } from '@prisma/client'
import { canSendOtp, otpVerifyState } from '~~/shared/domain/otp'

function otpKey() {
  return serverEnv().passwordPepper || serverEnv().sessionSecret
}

const TEMPLATE: Record<OtpPurpose, string> = {
  ACTIVATION: 'otp.activation',
  PASSWORD_CHANGE: 'otp.password_change',
  PASSWORD_RESET: 'otp.password_reset',
  SENSITIVE_ACTION: 'otp.password_reset'
}

export async function issueOtp(event: Parameters<typeof getHeader>[0], user: { id: string, email: string }, purpose: OtpPurpose) {
  const policy = await otpPolicy()
  const meta = requestMeta(event)
  const latest = await prisma.otpRequest.findFirst({
    where: { userId: user.id, purpose },
    orderBy: { createdAt: 'desc' }
  })
  const decision = canSendOtp({
    lastSentAt: latest?.createdAt ?? null,
    sendsThisHour: 0,
    sendsToday: 0,
    policy,
    now: new Date()
  })
  if (!decision.ok && decision.reason === 'cooldown') {
    throw createError({ statusCode: 429, statusMessage: 'Please wait before requesting another code.' })
  }
  await rateLimit(`otp:ip:${purpose}:${meta.ip ?? 'unknown'}`, policy.maxDailySends, 24 * 60 * 60)
  await rateLimit(`otp:hour:${user.id}:${purpose}`, policy.maxResendsPerHour, 60 * 60)
  await rateLimit(`otp:day:${user.id}:${purpose}`, policy.maxDailySends, 24 * 60 * 60)
  const code = numericCode(policy.length)
  const created = await prisma.otpRequest.create({
    data: {
      userId: user.id,
      purpose,
      codeHash: hashWithSecret(`${purpose}:${code}`, otpKey()),
      expiresAt: new Date(Date.now() + policy.expiryMinutes * 60 * 1000)
    }
  })
  const sent = await sendTemplate(TEMPLATE[purpose], user.email, { otp: code, minutes: String(policy.expiryMinutes) })
  if (!sent) {
    await prisma.otpRequest.delete({ where: { id: created.id } })
    throw createError({ statusCode: 503, statusMessage: 'The verification email could not be sent.' })
  }
  await writeAudit(event, { actorId: user.id, action: 'OTP_REQUESTED', entity: 'user', entityId: user.id, after: { purpose } })
}

export async function consumeOtp(event: Parameters<typeof getHeader>[0], userId: string, purpose: OtpPurpose, code: string) {
  const policy = await otpPolicy()
  await rateLimit(`otp:verify:${userId}:${purpose}`, policy.maxVerificationAttempts * 3, 60 * 60)
  const record = await prisma.otpRequest.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' }
  })
  if (!record) throw createError({ statusCode: 400, statusMessage: 'The code is invalid or has expired.' })
  const state = otpVerifyState({
    attemptCount: record.attemptCount,
    maxAttempts: policy.maxVerificationAttempts,
    expiresAt: record.expiresAt,
    consumed: false,
    now: new Date()
  })
  if (state !== 'ok') throw createError({ statusCode: 400, statusMessage: 'The code is invalid or has expired.' })
  const expected = hashWithSecret(`${purpose}:${code}`, otpKey())
  if (!safeEqual(record.codeHash, expected)) {
    await prisma.otpRequest.update({ where: { id: record.id }, data: { attemptCount: { increment: 1 } } })
    throw createError({ statusCode: 400, statusMessage: 'The code is invalid or has expired.' })
  }
  await prisma.otpRequest.update({ where: { id: record.id }, data: { consumedAt: new Date() } })
  await writeAudit(event, { actorId: userId, action: 'OTP_VERIFIED', entity: 'user', entityId: userId, after: { purpose } })
}
