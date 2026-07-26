import { isAdminRoute } from '#shared/auth/admin-route'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!isAdminRoute(to.path)) {
    return
  }

  if (import.meta.server && process.env.NUXT_E2E_BYPASS_ADMIN_AUTH === 'true') {
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
