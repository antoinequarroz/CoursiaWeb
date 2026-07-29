import type { CoursiaThemeName } from '#shared/design-system/tokens'

const THEME_STORAGE_KEY = 'coursia-theme'

function resolveInitialTheme(): CoursiaThemeName {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default defineNuxtPlugin(() => {
  document.documentElement.dataset.theme = resolveInitialTheme()
})
