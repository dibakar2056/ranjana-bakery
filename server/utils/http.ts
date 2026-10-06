import { ZodError, type ZodType } from 'zod'
import { Prisma } from '@prisma/client'

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return meta ? { data, meta } : { data }
}

export async function readValid<T>(event: Parameters<typeof readBody>[0], schema: ZodType<T>) {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Please check the form and try again.',
      data: {
        fields: parsed.error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      }
    })
  }
  return parsed.data
}

export function listQuery(event: Parameters<typeof getQuery>[0], allowedSort: string[], fallback = 'createdAt') {
  const query = getQuery(event)
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1))
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 20))
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : ''
  const requestedSort = typeof query.sort === 'string' ? query.sort : fallback
  const sort = allowedSort.includes(requestedSort) ? requestedSort : fallback
  const dir = query.dir === 'asc' ? 'asc' as const : 'desc' as const
  const from = typeof query.from === 'string' ? new Date(query.from) : null
  const to = typeof query.to === 'string' ? new Date(query.to) : null
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    search,
    sort,
    dir,
    from: from && !Number.isNaN(from.getTime()) ? from : null,
    to: to && !Number.isNaN(to.getTime()) ? to : null,
    status: typeof query.status === 'string' ? query.status : ''
  }
}

export function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, pageCount: Math.ceil(total / pageSize) }
}

export function publicError(error: unknown): never {
  if (isAppError(error)) throw error
  if (error instanceof ZodError) {
    throw createError({ statusCode: 422, statusMessage: 'Please check the form and try again.' })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'That value is already in use.' })
    }
    if (error.code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Record not found.' })
    }
  }
  logEvent('error', 'Unhandled server error', {
    name: error instanceof Error ? error.name : 'UnknownError',
    reason: errorText(error),
    code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined
  })
  throw createError({ statusCode: 500, statusMessage: 'Something went wrong. Please try again.' })
}

function isAppError(error: unknown): error is { statusCode: number } {
  return Boolean(error && typeof error === 'object' && 'statusCode' in error)
}

export function assertOrigin(event: Parameters<typeof getHeader>[0]) {
  const method = getMethod(event)
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return
  const origin = getHeader(event, 'origin')
  if (!origin) return
  const host = getHeader(event, 'host')
  if (!host) {
    throw createError({ statusCode: 403, statusMessage: 'Request blocked.' })
  }
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({ statusCode: 403, statusMessage: 'Request blocked.' })
  }
  if (originHost !== host) {
    throw createError({ statusCode: 403, statusMessage: 'Request blocked.' })
  }
}
