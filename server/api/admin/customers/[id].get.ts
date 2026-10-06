export default defineEventHandler(async (event) => {
  try {
    await requireUser(event, 'customer.read')
    const detail = await customerDetail(getRouterParam(event, 'id') ?? '')
    if (!detail) throw createError({ statusCode: 404, statusMessage: 'Customer not found.' })
    return ok(detail)
  } catch (error) {
    publicError(error)
  }
})
