import Redis from 'ioredis'

type MemoryBucket = { count: number, resetAt: number }

const memoryBuckets = new Map<string, MemoryBucket>()
const globalRedis = globalThis as unknown as { redis?: Redis | null, redisUrl?: string, redisDisabled?: boolean }

export function getRedis() {
  const url = serverEnv().redisUrl
  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw createError({ statusCode: 503, statusMessage: 'Service temporarily unavailable.' })
    }
    globalRedis.redisDisabled = true
    logEvent('warn', 'REDIS_URL is not set. Development is using in-memory rate limits.')
    return null
  }
  const current = globalRedis.redis
  const reusable = current
    && globalRedis.redisUrl === url
    && (current.status === 'ready' || current.status === 'wait' || current.status === 'connecting')
  if (reusable) return current
  current?.disconnect()
  const endpoint = new URL(url)
  const client = new Redis({
    host: endpoint.hostname,
    port: Number(endpoint.port || 6379),
    username: endpoint.username ? decodeURIComponent(endpoint.username) : undefined,
    password: endpoint.password ? decodeURIComponent(endpoint.password) : undefined,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 8000,
    retryStrategy(times) {
      if (times > 2) return null
      return times * 200
    }
  })
  client.on('error', (error: NodeJS.ErrnoException) => {
    logEvent('warn', 'Redis connection error', { host: endpoint.hostname, reason: errorText(error) || error.code || 'unknown' })
  })
  globalRedis.redis = client
  globalRedis.redisUrl = url
  globalRedis.redisDisabled = false
  return client
}

function memoryHit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now()
  const bucket = memoryBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
    return
  }
  bucket.count += 1
  if (bucket.count > limit) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
  }
}

export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const redis = getRedis()
  if (!redis) {
    if (process.env.NODE_ENV === 'production') {
      throw createError({ statusCode: 503, statusMessage: 'Service temporarily unavailable.' })
    }
    memoryHit(key, limit, windowSeconds)
    return
  }
  try {
    if (redis.status === 'wait') await redis.connect()
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    if (count > limit) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
    }
  } catch (error) {
    if (isHttpError(error)) throw error
    logEvent('error', 'Rate limit store unavailable', { key, reason: errorText(error) })
    if (process.env.NODE_ENV === 'production') {
      throw createError({ statusCode: 503, statusMessage: 'Service temporarily unavailable.' })
    }
    memoryHit(key, limit, windowSeconds)
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis()
    if (!redis) return null
    if (redis.status === 'wait') await redis.connect()
    const raw = await redis.get(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  try {
    const redis = getRedis()
    if (!redis) return
    if (redis.status === 'wait') await redis.connect()
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    logEvent('warn', 'Cache write skipped')
  }
}

export async function cacheDel(...keys: string[]) {
  try {
    const redis = getRedis()
    if (!redis || keys.length === 0) return
    if (redis.status === 'wait') await redis.connect()
    await redis.del(...keys)
  } catch {
    logEvent('warn', 'Cache invalidation skipped')
  }
}

function isHttpError(error: unknown): error is { statusCode: number } {
  return Boolean(error && typeof error === 'object' && 'statusCode' in error)
}
