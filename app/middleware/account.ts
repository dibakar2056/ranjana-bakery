export default defineNuxtRouteMiddleware(async () => {
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const me = await $fetch<{ data: unknown }>('/api/auth/me', { headers })
  if (!me.data) return navigateTo('/login')
})
