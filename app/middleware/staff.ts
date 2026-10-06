export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') return
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const me = await $fetch<{ data: { roles: string[] } | null }>('/api/auth/me', { headers })
  if (!me.data) return navigateTo('/admin/login')
  const staff = me.data.roles.some(role => role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'STAFF')
  if (!staff) return navigateTo('/admin/login')
})
