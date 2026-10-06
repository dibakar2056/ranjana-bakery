export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthUser(event)
    if (!user || user.sessionKind !== 'FULL') return ok(null)
    return ok(publicUser(user))
  } catch (error) {
    publicError(error)
  }
})
