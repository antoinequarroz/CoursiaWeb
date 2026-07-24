import { isAdminRoute } from '#shared/auth/admin-route'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!isAdminRoute(to.path)) {
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
