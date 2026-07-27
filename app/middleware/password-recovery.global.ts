export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) {
    return
  }

  if (!to.hash || to.path === '/auth/reset-password') {
    return
  }

  const params = new URLSearchParams(to.hash.slice(1))

  if (params.get('type') !== 'recovery') {
    return
  }

  return navigateTo(`/auth/reset-password${to.hash}`, { replace: true })
})
