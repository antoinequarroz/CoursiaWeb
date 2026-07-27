<script setup lang="ts">
import { filterAdminNavigationForRole } from '#shared/admin/dashboard'
import type { AdminRole } from '#shared/auth/permissions'

const route = useRoute()
const search = ref('')
const currentRole = ref<AdminRole>('super_administrator')
const visibleNavigation = computed(() => filterAdminNavigationForRole(currentRole.value))

const navigationIcon = (label: string) => {
  const icons: Record<string, string> = {
    Recettes: '🍽',
    'Import recettes': '↥',
    'Publication recettes': '✓',
    'Médias recettes': '◧',
    Ingrédients: '✽',
    Allergènes: '◇',
    Correspondances: '↔',
    Enseignes: '▣',
    Produits: '□',
    Prix: '⌁',
    Modération: '◌',
    Utilisateurs: '♙',
    Abonnements: '☆',
    Contenus: '≡',
    Paramètres: '⚙',
    Documentation: '⌘',
    Composants: '◫',
  }

  return icons[label] ?? '•'
}

const isActiveNavigationItem = (path: string) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }

  return route.path === path || route.path.startsWith(`${path}/`)
}

const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
  await navigateTo('/auth/login')
}
</script>

<template>
  <!-- Test contract: COURSIA ADMIN / Profil admin / Déconnexion -->
  <div class="admin-console min-h-screen bg-[#f7f4ed] text-[#101828]">
    <a
      href="#admin-main-content"
      class="ds-focus-ring sr-only z-50 rounded-md bg-coursia-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Aller au contenu admin
    </a>

    <aside class="fixed inset-y-0 left-0 hidden w-[19rem] border-r border-[#e6e1d8] bg-white/88 p-4 backdrop-blur-xl md:block">
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between px-2 py-2">
          <NuxtLink to="/admin" class="flex items-center gap-3" aria-label="Coursia admin">
            <svg class="h-11 w-11 text-[#0f5a3d]" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path d="M20 7c-7 1-11 6-11 13 7 1 13-3 14-10 4 2 7 6 7 11v14" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M15 28c8-2 17 1 22 8-10 6-21 3-24-5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M14 35h20" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            </svg>
            <span class="text-2xl font-black tracking-[0.16em] text-[#0f2d27]">COURSIA</span>
          </NuxtLink>
          <button type="button" class="rounded-lg px-2 py-1 text-xl text-[#667085] hover:bg-[#f2f0ea]">‹</button>
        </div>

        <nav class="mt-8 grid gap-5 text-[0.95rem]" aria-label="Navigation administration">
          <NuxtLink
            to="/admin"
            class="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition"
            :class="isActiveNavigationItem('/admin')
              ? 'bg-[#1f6b4a] text-white shadow-[0_12px_28px_rgb(31_107_74_/_18%)]'
              : 'text-[#344054] hover:bg-[#f2f0ea]'"
          >
            <span class="text-base">⌂</span>
            <span>Tableau de bord</span>
          </NuxtLink>

          <section v-for="section in visibleNavigation" :key="section.title">
            <h2 class="px-4 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[#98a2b3]">
              {{ section.title }}
            </h2>
            <div class="mt-2 grid gap-0.5">
              <NuxtLink
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                class="flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium transition"
                :class="isActiveNavigationItem(item.path)
                  ? 'bg-[#edf6ef] text-[#0f5a3d]'
                  : 'text-[#344054] hover:bg-[#f2f0ea]'"
              >
                <span class="w-5 text-center text-sm opacity-80">{{ navigationIcon(item.label) }}</span>
                <span>{{ item.label }}</span>
              </NuxtLink>
            </div>
          </section>
        </nav>

        <div class="mt-auto rounded-2xl border border-[#e6e1d8] bg-white p-3 shadow-sm">
          <div class="flex items-center gap-3">
            <span class="grid h-11 w-11 place-items-center rounded-full bg-[#e8f3ea] text-sm font-black text-[#0f5a3d]">AQ</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-[#101828]">Antoine Quarroz</p>
              <p class="truncate text-xs text-[#667085]">Profil admin</p>
            </div>
            <button type="button" class="text-[#667085]" @click="logout">⌄</button>
          </div>
          <button
            type="button"
            class="mt-3 w-full rounded-xl border border-[#e6e1d8] px-3 py-2 text-sm font-semibold text-[#667085] transition hover:bg-[#f7f4ed] hover:text-[#101828]"
            @click="logout"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </aside>

    <div class="md:pl-[19rem]">
      <header class="sticky top-0 z-30 border-b border-[#e6e1d8] bg-white/82 px-6 py-4 backdrop-blur-xl">
        <div class="flex items-center justify-between gap-5">
          <label class="relative hidden min-w-[24rem] flex-1 md:block md:max-w-2xl">
            <span class="sr-only">Recherche admin</span>
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]">⌕</span>
            <input
              v-model="search"
              type="search"
              placeholder="Rechercher une recette, un ingrédient, un utilisateur..."
              class="ds-focus-ring h-12 w-full rounded-2xl border border-[#e6e1d8] bg-white px-11 text-sm shadow-sm placeholder:text-[#98a2b3]"
            />
            <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#98a2b3]">⌘ K</span>
          </label>

          <div class="flex shrink-0 items-center gap-4">
            <button type="button" class="relative grid h-11 w-11 place-items-center rounded-full border border-[#e6e1d8] bg-white text-[#344054] shadow-sm">
              ♧
              <span class="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-[#ff4d3d] text-[0.68rem] font-black text-white">3</span>
            </button>
            <BaseThemeToggle />
            <NuxtLink
              to="/"
              class="hidden rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] shadow-sm transition hover:bg-[#f7f4ed] lg:inline-flex"
            >
              Site public
            </NuxtLink>
            <button
              type="button"
              class="inline-flex items-center gap-3 rounded-2xl bg-[#1f6b4a] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgb(31_107_74_/_22%)] transition hover:bg-[#18583d]"
            >
              <span class="text-lg leading-none">+</span>
              Ajouter
              <span class="text-white/75">⌄</span>
            </button>
          </div>
        </div>
      </header>

      <main id="admin-main-content" tabindex="-1" class="px-6 py-7 lg:px-9">
        <slot />
      </main>
    </div>
  </div>
</template>
