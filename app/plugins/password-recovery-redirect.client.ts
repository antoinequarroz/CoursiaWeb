export default defineNuxtPlugin(() => {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  if (hash.get('type') !== 'recovery') {
    return
  }

  if (window.location.pathname === '/auth/reset-password') {
    return
  }

  window.location.replace(`/auth/reset-password${window.location.hash}`)
})
