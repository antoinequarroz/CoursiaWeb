import { isAdminRoute } from '#shared/auth/admin-route'
import { isE2eAdminAuthBypassAllowed } from '#shared/security/admin-auth-bypass'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!isAdminRoute(to.path)) {
    return
  }

  if (import.meta.server && isE2eAdminAuthBypassAllowed()) {
    return
  }

  const { authenticated } = await $fetch<{ authenticated: boolean }>('/api/auth/session').catch(
    () => ({ authenticated: false }),
  )

  if (authenticated) {
    return
  }

  return navigateTo({
    path: '/auth/login',
    query: {
      redirect: to.fullPath,
    },
  })
})
