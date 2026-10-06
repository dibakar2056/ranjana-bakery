import nodemailer from 'nodemailer'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

export function renderTemplate(body: string, variables: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => escapeHtml(variables[key] ?? ''))
}

const FALLBACKS: Record<string, { subject: string, body: string }> = {
  'user.invitation': {
    subject: 'Activate your Ranjana Bakery account',
    body: '<p>Hello {{name}},</p><p>Username: {{username}}</p><p>Temporary password: {{temporaryPassword}}</p><p><a href="{{activationUrl}}">Activate your account</a>. Replace this password during activation.</p>'
  },
  'otp.activation': {
    subject: 'Your activation code',
    body: '<p>Your activation code is <strong>{{otp}}</strong>. It expires in {{minutes}} minutes.</p>'
  },
  'otp.password_change': {
    subject: 'Your password change code',
    body: '<p>Your password change code is <strong>{{otp}}</strong>. It expires in {{minutes}} minutes.</p>'
  },
  'otp.password_reset': {
    subject: 'Your password reset code',
    body: '<p>Your password reset code is <strong>{{otp}}</strong>. It expires in {{minutes}} minutes.</p>'
  },
  'password.changed': {
    subject: 'Your password was changed',
    body: '<p>Hello {{name}}, your Ranjana Bakery password was changed.</p>'
  }
}

export async function sendTemplate(key: string, to: string, variables: Record<string, string>) {
  const stored = await prisma.emailTemplate.findUnique({ where: { key } }).catch(() => null)
  const fallback = FALLBACKS[key]
  const subject = renderTemplate(stored?.subject || fallback?.subject || key, variables)
  const html = renderTemplate(stored?.body || fallback?.body || '', variables)
  const env = serverEnv()
  if (!env.smtpHost) {
    logEvent('warn', 'Email skipped because SMTP is not configured', { template: key, to })
    return false
  }
  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    requireTLS: env.smtpPort === 587,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined
  })
  try {
    await transport.sendMail({
      from: env.smtpFrom || env.smtpUser,
      to,
      subject,
      html
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'responseCode' in error ? error.responseCode : undefined
    logEvent('error', 'Email failed', { template: key, code })
    return false
  }
  logEvent('info', 'Email sent', { template: key })
  return true
}
