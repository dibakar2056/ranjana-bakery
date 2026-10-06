export function serverEnv() {
  return {
    redisUrl: process.env.REDIS_URL || '',
    sessionSecret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-session-secret-change-me'),
    passwordPepper: process.env.PASSWORD_PEPPER || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    smtpFrom: process.env.SMTP_FROM || '',
    r2AccountId: process.env.R2_ACCOUNT_ID || '',
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    r2Bucket: process.env.R2_BUCKET_NAME || '',
    r2PublicUrl: process.env.R2_PUBLIC_URL || '',
    sentryDsn: process.env.SENTRY_DSN || '',
    cronSecret: process.env.CRON_SECRET || '',
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }
}
