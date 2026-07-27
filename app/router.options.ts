import type { RouterConfig } from '@nuxt/schema'

const isSupabaseAuthHash = (hash: string) => {
  if (!hash.startsWith('#')) {
    return false
  }

  const params = new URLSearchParams(hash.slice(1))

  return Boolean(params.get('access_token') || params.get('refresh_token') || params.get('type'))
}

export default {
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash && isSupabaseAuthHash(to.hash)) {
      return { left: 0, top: 0 }
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    }

    return { left: 0, top: 0 }
  },
} satisfies RouterConfig
