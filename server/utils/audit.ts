import type { Prisma } from '@prisma/client'

export async function writeAudit(event: Parameters<typeof getHeader>[0], input: {
  actorId?: string | null
  action: string
  entity: string
  entityId?: string | null
  before?: unknown
  after?: unknown
}) {
  const meta = requestMeta(event)
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before === undefined ? undefined : input.before as Prisma.InputJsonValue,
      after: input.after === undefined ? undefined : input.after as Prisma.InputJsonValue,
      ip: meta.ip,
      userAgent: meta.userAgent
    }
  })
}
