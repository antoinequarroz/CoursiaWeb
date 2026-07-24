<script setup lang="ts">
const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
  await navigateTo('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-coursia-background text-coursia-foreground" data-theme="dark">
    <aside
      class="fixed inset-y-0 left-0 hidden w-64 border-r border-coursia-border bg-coursia-surface p-6 md:block"
    >
      <NuxtLink to="/" class="text-lg font-semibold">Coursia Admin</NuxtLink>
      <nav class="mt-8 grid gap-3 text-sm text-coursia-muted">
        <NuxtLink to="/admin" class="hover:text-coursia-foreground">Dashboard</NuxtLink>
      </nav>
    </aside>

    <div class="md:pl-64">
      <header class="border-b border-coursia-border bg-coursia-surface px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <p class="text-sm text-coursia-muted">Administration</p>
          <BaseButton variant="ghost" size="sm" type="button" @click="logout">
            Déconnexion
          </BaseButton>
        </div>
      </header>
      <main class="px-6 py-8">
        <slot />
      </main>
    </div>
  </div>
</template>
