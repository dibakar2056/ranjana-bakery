export default defineEventHandler(async (event) => {
  try {
    await endSession(event)
    return ok({ signedOut: true })
  } catch (error) {
    publicError(error)
  }
})
