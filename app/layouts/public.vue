<template>
  <div class="min-h-screen bg-coursia-background">
    <header class="border-b border-coursia-border bg-coursia-surface">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NuxtLink to="/" class="text-lg font-semibold text-coursia-primary">Coursia</NuxtLink>
        <div class="flex items-center gap-4">
          <NuxtLink
            to="/design-system"
            class="text-sm font-medium text-coursia-muted hover:text-coursia-primary"
          >
            Design system
          </NuxtLink>
          <NuxtLink
            to="/admin"
            class="text-sm font-medium text-coursia-muted hover:text-coursia-primary"
          >
            Administration
          </NuxtLink>
        </div>
      </nav>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-10">
      <slot />
    </main>
  </div>
</template>
