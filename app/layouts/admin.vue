<script setup lang="ts">
import {
  filterAdminNavigationForRole,
} from '#shared/admin/dashboard'
import type { AdminRole } from '#shared/auth/permissions'

const search = ref('')
const currentRole = ref<AdminRole>('administrator')
const visibleNavigation = computed(() => filterAdminNavigationForRole(currentRole.value))

const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
  await navigateTo('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-coursia-background text-coursia-foreground" data-theme="dark">
    <aside
      class="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-coursia-border bg-coursia-surface p-6 md:block"
    >
      <NuxtLink to="/admin" class="text-lg font-black tracking-[0.14em]">COURSIA ADMIN</NuxtLink>
      <nav class="mt-8 grid gap-7 text-sm">
        <NuxtLink to="/admin" class="rounded-xl bg-coursia-primary px-4 py-3 font-black text-white">
          Tableau de bord
        </NuxtLink>
        <section v-for="section in visibleNavigation" :key="section.title">
          <h2 class="text-xs font-black uppercase tracking-[0.18em] text-coursia-muted">
            {{ section.title }}
          </h2>
          <div class="mt-3 grid gap-1">
            <NuxtLink
              v-for="item in section.items"
              :key="item.path"
              :to="item.path"
              class="rounded-xl px-4 py-2 text-coursia-muted hover:bg-coursia-surface-muted hover:text-coursia-foreground"
            >
              {{ item.label }}
            </NuxtLink>
          </div>
        </section>
      </nav>
    </aside>

    <div class="md:pl-72">
      <header class="border-b border-coursia-border bg-coursia-surface px-6 py-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm text-coursia-muted">Administration sécurisée</p>
            <p class="text-xs text-coursia-muted">Rôle courant : {{ currentRole }}</p>
          </div>
          <label class="min-w-72 flex-1 md:max-w-md">
            <span class="sr-only">Recherche admin</span>
            <input
              v-model="search"
              type="search"
              placeholder="Rechercher recettes, utilisateurs, prix..."
              class="w-full rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-2 text-sm"
            />
          </label>
          <div class="flex items-center gap-3">
            <div class="rounded-full bg-coursia-surface-muted px-4 py-2 text-sm font-bold">
              Profil admin
            </div>
            <BaseButton variant="ghost" size="sm" type="button" @click="logout">
              Déconnexion
            </BaseButton>
          </div>
        </div>
      </header>
      <main class="px-6 py-8">
        <slot />
      </main>
    </div>
  </div>
</template>

