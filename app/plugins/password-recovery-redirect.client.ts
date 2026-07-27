export default defineNuxtPlugin(() => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const hasRecoveryTokens = Boolean(hash.get('access_token') && hash.get('refresh_token'))

  if (hash.get('type') !== 'recovery' && !hasRecoveryTokens) {
    return
  }

  if (window.location.pathname === '/auth/reset-password') {
    return
  }

  window.location.replace(`/auth/reset-password${window.location.hash}`)
})
