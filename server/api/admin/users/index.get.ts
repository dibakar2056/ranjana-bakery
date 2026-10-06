export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'user.read')
    const query = listQuery(event, ['createdAt', 'username', 'email'])
    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { displayName: { contains: query.search, mode: 'insensitive' as const } }
            ]
          }
        : {})
    }
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { roles: { include: { role: true } } },
        orderBy: { [query.sort]: query.dir },
        skip: query.skip,
        take: query.pageSize
      }),
      prisma.user.count({ where })
    ])
    return ok(rows.map(presentUser), pageMeta(query.page, query.pageSize, total))
  } catch (error) {
    publicError(error)
  }
})
