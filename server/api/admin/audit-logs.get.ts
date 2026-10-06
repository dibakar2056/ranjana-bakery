export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'audit.read')
    const query = listQuery(event, ['createdAt'])
    const where = query.search
      ? { OR: [{ action: { contains: query.search, mode: 'insensitive' as const } }, { entity: { contains: query.search, mode: 'insensitive' as const } }] }
      : {}
    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: query.dir },
        skip: query.skip,
        take: query.pageSize,
        include: { actor: { select: { username: true, displayName: true } } }
      }),
      prisma.auditLog.count({ where })
    ])
    return ok(rows.map(row => ({
      id: row.id,
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      actor: row.actor?.displayName ?? 'System',
      createdAt: row.createdAt
    })), pageMeta(query.page, query.pageSize, total))
  } catch (error) {
    publicError(error)
  }
})
