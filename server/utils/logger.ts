const REDACT = /password|otp|token|secret|cookie|authorization|pepper|credential/i

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => redact(item))
  if (!value || typeof value !== 'object') return value
  const output: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    output[key] = REDACT.test(key) ? '[redacted]' : redact(entry)
  }
  return output
}

export function errorText(error: unknown) {
  if (error instanceof AggregateError) {
    const reasons = error.errors.map(item => item instanceof Error ? item.message : String(item)).filter(Boolean)
    if (reasons.length) return reasons.join('; ')
  }
  const message = error instanceof Error ? error.message : 'Unknown error'
  return message.replace(/([a-z+]+:\/\/)[^/\s]+@/gi, '$1[redacted]@').slice(0, 300)
}

export function logEvent(level: 'info' | 'warn' | 'error', message: string, fields: Record<string, unknown> = {}) {
  const line = {
    level,
    message,
    time: new Date().toISOString(),
    ...redact(fields) as Record<string, unknown>
  }
  const write = level === 'error' ? console.error : console.log
  write(JSON.stringify(line))
}
