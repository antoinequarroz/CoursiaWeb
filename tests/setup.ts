import { afterEach } from 'vitest'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  document.body.innerHTML = ''
  window.localStorage.clear()
})
