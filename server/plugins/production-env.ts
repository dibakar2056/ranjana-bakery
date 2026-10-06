export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return
  const required = ['DATABASE_URL', 'REDIS_URL', 'SESSION_SECRET', 'PASSWORD_PEPPER']
  for (const key of required) {
    const value = process.env[key] || ''
    if (value.length < 16) {
      throw new Error(`Missing production environment variable ${key}`)
    }
  }
})
