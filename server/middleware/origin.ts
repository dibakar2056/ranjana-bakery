export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  assertOrigin(event)
})
