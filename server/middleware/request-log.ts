export default defineEventHandler(async (event) => {
  const requestId = getHeader(event, 'x-request-id') || crypto.randomUUID()
  event.context.requestId = requestId
  setHeader(event, 'x-request-id', requestId)
  const started = Date.now()
  event.node.res.on('finish', () => {
    const path = getRequestURL(event).pathname
    if (!path.startsWith('/api/')) return
    const status = event.node.res.statusCode
    logEvent(status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', 'request', {
      requestId,
      endpoint: path,
      method: getMethod(event),
      status,
      durationMs: Date.now() - started,
      userId: event.context.userId ?? null
    })
  })
})
