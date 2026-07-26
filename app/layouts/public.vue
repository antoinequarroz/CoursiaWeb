<template>
  <div class="min-h-screen bg-coursia-background">
    <a
      href="#main-content"
      class="ds-focus-ring sr-only z-50 rounded-full bg-coursia-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Aller au contenu principal
    </a>
    <main id="main-content" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
