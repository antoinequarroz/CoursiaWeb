<script setup lang="ts">
import type { CoursiaThemeName } from '#shared/design-system/tokens'

const currentTheme = ref<CoursiaThemeName>('light')

const applyTheme = (theme: CoursiaThemeName) => {
  currentTheme.value = theme

  if (import.meta.client) {
    document.documentElement.dataset.theme = theme
  }
}

onMounted(() => {
  const storedTheme = window.localStorage.getItem('coursia-theme')

  if (storedTheme === 'light' || storedTheme === 'dark') {
    applyTheme(storedTheme)
    return
  }

  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
})

const toggleTheme = () => {
  const nextTheme = currentTheme.value === 'light' ? 'dark' : 'light'
  window.localStorage.setItem('coursia-theme', nextTheme)
  applyTheme(nextTheme)
}
</script>

<template>
  <BaseButton
    variant="secondary"
    size="sm"
    type="button"
    :aria-label="`Activer le thème ${currentTheme === 'light' ? 'sombre' : 'clair'}`"
    @click="toggleTheme"
  >
    {{ currentTheme === 'light' ? 'Thème sombre' : 'Thème clair' }}
  </BaseButton>
</template>
