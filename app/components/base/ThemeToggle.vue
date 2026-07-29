<script setup lang="ts">
import type { CoursiaThemeName } from '#shared/design-system/tokens'

const THEME_STORAGE_KEY = 'coursia-theme'

const currentTheme = ref<CoursiaThemeName>('light')
const isHydrated = ref(false)

function resolveTheme(): CoursiaThemeName {
  if (!import.meta.client) {
    return 'light'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: CoursiaThemeName) {
  if (!import.meta.client) {
    currentTheme.value = theme
    return
  }

  document.documentElement.classList.add('theme-switching')
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  currentTheme.value = theme

  void document.documentElement.offsetHeight

  window.setTimeout(() => {
    document.documentElement.classList.remove('theme-switching')
  }, 0)
}

if (import.meta.client) {
  currentTheme.value = resolveTheme()
}

onMounted(() => {
  isHydrated.value = true
  applyTheme(currentTheme.value)
})

function toggleTheme() {
  const nextTheme = currentTheme.value === 'light' ? 'dark' : 'light'
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  applyTheme(nextTheme)
}
</script>

<template>
  <BaseButton
    variant="secondary"
    size="sm"
    type="button"
    :aria-label="isHydrated ? `Activer le thème ${currentTheme === 'light' ? 'sombre' : 'clair'}` : 'Changer le thème'"
    @click="toggleTheme"
  >
    {{ isHydrated ? (currentTheme === 'light' ? 'Dark' : 'Light') : 'Thème' }}
  </BaseButton>
</template>
