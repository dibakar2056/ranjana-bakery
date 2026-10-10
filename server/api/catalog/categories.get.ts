export default defineEventHandler(async () => {
  try {
    const rows = await prisma.category.findMany({
      where: { deletedAt: null, isActive: true },
      include: { _count: { select: { products: { where: { deletedAt: null, status: 'ACTIVE' } } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    })
    return ok(rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      image: row.imageUrl,
      products: row._count.products
    })))
  } catch (error) {
    publicError(error)
  }
})
