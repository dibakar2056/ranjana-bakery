export default defineEventHandler(async () => {
  try {
    const settings = await getSettings()
    return ok({
      name: String(settings['store.name']),
      phone: String(settings['store.phone']),
      email: String(settings['store.email']),
      address: String(settings['store.address']),
      opens: String(settings['store.opening_time']),
      closes: String(settings['store.closing_time'])
    })
  } catch (error) {
    publicError(error)
  }
})
