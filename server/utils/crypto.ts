import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function hashWithSecret(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('hex')
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function numericCode(length: number) {
  let code = ''
  for (let index = 0; index < length; index += 1) {
    code += String(randomInt(0, 10))
  }
  return code
}

export function temporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%^&*'
  const all = upper + lower + digits + special
  const chars = [
    upper[randomInt(upper.length)]!,
    lower[randomInt(lower.length)]!,
    digits[randomInt(digits.length)]!,
    special[randomInt(special.length)]!
  ]
  while (chars.length < 16) {
    chars.push(all[randomInt(all.length)]!)
  }
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1)
    const current = chars[index]!
    chars[index] = chars[swap]!
    chars[swap] = current
  }
  return chars.join('')
}

export function clientIp(event: Parameters<typeof getRequestIP>[0]) {
  return getRequestIP(event, { xForwardedFor: true }) ?? null
}

export function requestMeta(event: Parameters<typeof getRequestIP>[0]) {
  return {
    ip: clientIp(event),
    userAgent: getHeader(event, 'user-agent')?.slice(0, 300) ?? null
  }
}
