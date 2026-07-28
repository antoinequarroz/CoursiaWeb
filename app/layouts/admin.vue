<script setup lang="ts">
import { filterAdminNavigationForRole } from '#shared/admin/dashboard'
import type { AdminRole } from '#shared/auth/permissions'

const route = useRoute()
const search = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const searchPanelOpen = ref(false)
const searchPending = ref(false)
const searchError = ref('')
const currentRole = ref<AdminRole>('super_administrator')
const notificationPanelOpen = ref(false)
const unreadNotifications = useState('admin-unread-notifications', () => 0)
const notificationPending = ref(false)
const notificationError = ref('')
const notificationsLoaded = ref(false)
const visibleNavigation = computed(() => filterAdminNavigationForRole(currentRole.value))

type AdminNotification = {
  id: string
  titre: string
  message: string
  type: string
  lue: boolean | null
  created_at: string | null
}

const notifications = ref<AdminNotification[]>([])

type AdminSearchResult = {
  id: string
  type: 'recipe' | 'ingredient' | 'product' | 'retailer' | 'user' | 'content'
  label: string
  description: string
  href: string
}

const searchResults = ref<AdminSearchResult[]>([])
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const searchTypeLabel: Record<AdminSearchResult['type'], string> = {
  recipe: 'Recette',
  ingredient: 'Ingrédient',
  product: 'Produit',
  retailer: 'Enseigne',
  user: 'Utilisateur',
  content: 'Contenu',
}

const searchResultIcon = (type: AdminSearchResult['type']) => {
  const icons: Record<AdminSearchResult['type'], string> = {
    recipe: 'recipes',
    ingredient: 'ingredients',
    product: 'products',
    retailer: 'retailers',
    user: 'users',
    content: 'content',
  }

  return icons[type]
}

const navigationIcon = (path: string) => {
  const icons: Record<string, string> = {
    '/admin': 'dashboard',
    '/admin/recettes': 'recipes',
    '/admin/recettes/import': 'import',
    '/admin/recettes/publication': 'publication',
    '/admin/recettes/medias': 'media',
    '/admin/ingredients': 'ingredients',
    '/admin/allergenes': 'allergens',
    '/admin/correspondances': 'matching',
    '/admin/enseignes': 'retailers',
    '/admin/produits': 'products',
    '/admin/prix': 'prices',
    '/admin/moderation': 'moderation',
    '/admin/leads': 'leads',
    '/admin/utilisateurs': 'users',
    '/admin/abonnements': 'subscriptions',
    '/admin/contenus': 'content',
    '/admin/parametres': 'settings',
    '/admin/documentation': 'documentation',
    '/admin/composants': 'components',
  }

  return icons[path] ?? 'default'
}

const isActiveNavigationItem = (path: string) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }

  return route.path === path
}

const currentNavigationItem = computed(() => {
  const flatItems = visibleNavigation.value.flatMap((section) => section.items)
  return flatItems.find((item) => route.path === item.path) ?? null
})

const pageTitle = computed(() => {
  if (route.path === '/admin') {
    return 'Tableau de bord'
  }

  return currentNavigationItem.value?.label ?? 'Administration'
})

const notificationLabel = computed(() => {
  const count = unreadNotifications.value

  if (count <= 0) {
    return 'Aucune notification non lue'
  }

  return `${count} notification${count > 1 ? 's' : ''} non lue${count > 1 ? 's' : ''}`
})

watch(() => route.fullPath, () => {
  notificationPanelOpen.value = false
  searchPanelOpen.value = false
})

const runAdminSearch = async () => {
  const query = search.value.trim()

  if (query.length < 2) {
    searchResults.value = []
    searchPanelOpen.value = false
    searchError.value = ''
    return
  }

  searchPending.value = true
  searchError.value = ''
  searchPanelOpen.value = true

  try {
    const response = await $fetch<{ data: AdminSearchResult[] }>('/api/admin/search', {
      query: {
        q: query,
        limit: 4,
      },
    })

    searchResults.value = response.data
  }
  catch {
    searchError.value = 'Recherche indisponible.'
    searchResults.value = []
  }
  finally {
    searchPending.value = false
  }
}

watch(search, () => {
  if (searchDebounce) {
    clearTimeout(searchDebounce)
  }

  searchDebounce = setTimeout(() => {
    void runAdminSearch()
  }, 220)
})

const clearAdminSearch = () => {
  search.value = ''
  searchResults.value = []
  searchPanelOpen.value = false
  searchError.value = ''
}

const focusAdminSearch = () => {
  searchInput.value?.focus()
  if (search.value.trim().length >= 2) {
    searchPanelOpen.value = true
  }
}

const onAdminKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    focusAdminSearch()
  }

  if (event.key === 'Escape') {
    searchPanelOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onAdminKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onAdminKeydown)
  if (searchDebounce) {
    clearTimeout(searchDebounce)
  }
})

const formatNotificationDate = (value: string | null) => {
  if (!value) {
    return 'Date inconnue'
  }

  return new Date(value).toLocaleString('fr-CH', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

const loadNotifications = async () => {
  notificationPending.value = true
  notificationError.value = ''

  try {
    const response = await $fetch<{
      data: AdminNotification[]
      unreadCount: number
    }>('/api/admin/notifications', {
      query: {
        limit: 10,
      },
    })

    notifications.value = response.data
    unreadNotifications.value = response.unreadCount
    notificationsLoaded.value = true
  }
  catch {
    notificationError.value = 'Impossible de charger les notifications.'
  }
  finally {
    notificationPending.value = false
  }
}

const toggleNotifications = async () => {
  notificationPanelOpen.value = !notificationPanelOpen.value

  if (notificationPanelOpen.value && !notificationsLoaded.value) {
    await loadNotifications()
  }
}

const markNotificationAsRead = async (notification: AdminNotification) => {
  if (notification.lue) {
    return
  }

  try {
    const response = await $fetch<{
      data: AdminNotification
    }>(`/api/admin/notifications/${notification.id}/read`, {
      method: 'POST',
    })

    notifications.value = notifications.value.map((item) =>
      item.id === notification.id ? response.data : item,
    )
    unreadNotifications.value = Math.max(0, unreadNotifications.value - 1)
  }
  catch {
    notificationError.value = 'Impossible de marquer la notification comme lue.'
  }
}

onMounted(() => {
  void loadNotifications()
})

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

    <aside class="fixed inset-y-0 left-0 z-40 hidden w-[17.25rem] overflow-hidden border-r border-[#e6e1d8] bg-white/92 p-3 backdrop-blur-xl md:block">
      <div class="flex h-full min-h-0 flex-col">
        <div class="shrink-0 flex items-center justify-between rounded-2xl px-2 py-2">
          <NuxtLink to="/admin" aria-label="Coursia admin">
            <BaseBrandLogo icon-class="h-10 w-10" text-class="text-lg" />
          </NuxtLink>
          <span class="rounded-lg border border-[#e6e1d8] px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#667085]">
            admin
          </span>
        </div>

        <nav class="admin-sidebar-nav mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 text-[0.86rem]" aria-label="Navigation administration">
          <NuxtLink
            to="/admin"
            class="admin-nav-link group flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition"
            :class="isActiveNavigationItem('/admin')
              ? 'is-active text-[#0f5a3d]'
              : 'text-[#344054] hover:bg-[#f7f4ed]'"
          >
            <span class="grid h-7 w-7 place-items-center rounded-lg border border-[#e4ded2] bg-white text-[#667085] group-[.is-active]:border-[#b8d6c4] group-[.is-active]:bg-[#eaf5ee] group-[.is-active]:text-[#0f5a3d]">
              <AdminNavIcon :name="navigationIcon('/admin')" />
            </span>
            <span>Tableau de bord</span>
          </NuxtLink>

          <section v-for="section in visibleNavigation" :key="section.title" class="mt-5 first:mt-5">
            <h2 class="px-3 text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#98a2b3]">
              {{ section.title }}
            </h2>
            <div class="mt-2 grid gap-0.5">
              <NuxtLink
                v-for="item in section.items"
                :key="item.path"
                :to="item.path"
                class="admin-nav-link group flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition"
                :class="isActiveNavigationItem(item.path)
                  ? 'is-active text-[#0f5a3d]'
                  : 'text-[#344054] hover:bg-[#f7f4ed]'"
              >
                <span class="grid h-7 w-7 place-items-center rounded-lg border border-[#e4ded2] bg-white text-[#667085] group-[.is-active]:border-[#b8d6c4] group-[.is-active]:bg-[#eaf5ee] group-[.is-active]:text-[#0f5a3d]">
                  <AdminNavIcon :name="navigationIcon(item.path)" />
                </span>
                <span>{{ item.label }}</span>
              </NuxtLink>
            </div>
          </section>
        </nav>

        <div class="mt-3 shrink-0 rounded-2xl border border-[#e6e1d8] bg-white p-3 shadow-sm">
          <div class="flex items-center gap-3">
            <span class="grid h-11 w-11 place-items-center rounded-full bg-[#e8f3ea] text-sm font-black text-[#0f5a3d]">AQ</span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-bold text-[#101828]">Antoine Quarroz</p>
              <p class="truncate text-xs text-[#667085]">Profil admin</p>
            </div>
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-[#667085] transition hover:bg-[#f7f4ed] hover:text-[#101828]"
              aria-label="Déconnexion"
              title="Déconnexion"
              @click="logout"
            >
              <AdminNavIcon name="logout" />
            </button>
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

    <div class="relative z-10 md:pl-[17.25rem]">
      <header class="sticky top-0 z-30 border-b border-[#e6e1d8] bg-white/86 px-4 py-3 backdrop-blur-xl lg:px-7">
        <div class="flex items-center justify-between gap-4">
          <div class="min-w-0">
            <p class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#98a2b3]">Coursia admin</p>
            <p class="truncate text-lg font-black tracking-[-0.03em] text-[#101828]">{{ pageTitle }}</p>
          </div>

          <div class="relative hidden min-w-[20rem] flex-1 md:block md:max-w-xl">
            <label for="admin-global-search" class="sr-only">Recherche admin</label>
            <span class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]">
              <AdminNavIcon name="search" />
            </span>
            <input
              id="admin-global-search"
              ref="searchInput"
              v-model="search"
              type="search"
              role="combobox"
              autocomplete="off"
              placeholder="Rechercher recette, ingrédient, produit, utilisateur..."
              class="ds-focus-ring h-10 w-full rounded-xl border border-[#e6e1d8] bg-white px-10 pr-20 text-sm shadow-sm placeholder:text-[#98a2b3]"
              :aria-expanded="searchPanelOpen"
              aria-controls="admin-search-results"
              @focus="focusAdminSearch"
            />
            <button
              v-if="search"
              type="button"
              class="absolute right-16 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-black text-[#667085] hover:bg-[#f7f4ed]"
              aria-label="Effacer la recherche"
              @click="clearAdminSearch"
            >
              ×
            </button>
            <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#98a2b3]">Ctrl K</span>

            <div
              v-if="searchPanelOpen"
              id="admin-search-results"
              class="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white text-sm shadow-[0_22px_70px_rgba(15,26,20,0.16)]"
            >
              <div v-if="searchPending" class="p-4 text-[#667085]">
                Recherche en cours...
              </div>
              <div v-else-if="searchError" class="p-4 text-[#b42318]">
                {{ searchError }}
              </div>
              <div v-else-if="searchResults.length <= 0" class="p-4 text-[#667085]">
                Aucun résultat pour “{{ search.trim() }}”.
              </div>
              <div v-else class="max-h-[24rem] overflow-y-auto p-2">
                <NuxtLink
                  v-for="result in searchResults"
                  :key="`${result.type}-${result.id}`"
                  :to="result.href"
                  class="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#f7f4ed]"
                  @click="clearAdminSearch"
                >
                  <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e4ded2] bg-[#fbfaf7] text-[#0f5a3d]">
                    <AdminNavIcon :name="searchResultIcon(result.type)" />
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-black text-[#101828]">{{ result.label }}</span>
                    <span class="mt-0.5 block truncate text-xs text-[#667085]">{{ result.description }}</span>
                  </span>
                  <span class="ml-auto shrink-0 rounded-full bg-[#eef1ee] px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#667085]">
                    {{ searchTypeLabel[result.type] }}
                  </span>
                </NuxtLink>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <div class="relative">
              <button
                type="button"
                class="relative grid h-10 w-10 place-items-center rounded-xl border border-[#e6e1d8] bg-white text-[#344054] shadow-sm transition hover:bg-[#f7f4ed] hover:text-[#0f5a3d]"
                :aria-label="notificationLabel"
                :aria-expanded="notificationPanelOpen"
                aria-controls="admin-notifications-panel"
                title="Notifications"
                @click="toggleNotifications"
              >
                <AdminNavIcon name="notifications" />
                <span
                  v-if="unreadNotifications > 0"
                  class="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ff4d3d] px-1 text-[0.58rem] font-black text-white"
                >
                  {{ unreadNotifications > 9 ? '9+' : unreadNotifications }}
                </span>
              </button>

              <div
                v-if="notificationPanelOpen"
                id="admin-notifications-panel"
                class="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-[#e6e1d8] bg-white p-3 text-sm shadow-[0_22px_70px_rgba(15,26,20,0.16)]"
              >
                <div class="flex items-start justify-between gap-3 border-b border-[#eee8dd] pb-3">
                  <div>
                    <p class="font-black text-[#101828]">Notifications</p>
                    <p class="mt-1 text-xs text-[#667085]">{{ notificationLabel }}</p>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1 text-xs font-bold text-[#667085] hover:bg-[#f7f4ed]"
                    aria-label="Fermer les notifications"
                    @click="notificationPanelOpen = false"
                  >
                    Fermer
                  </button>
                </div>

                <div class="py-4">
                  <div
                    v-if="notificationPending"
                    class="rounded-xl bg-[#f7f4ed] p-4 text-[#667085]"
                  >
                    Chargement des notifications...
                  </div>
                  <div
                    v-else-if="notificationError"
                    class="rounded-xl bg-[#fff0ed] p-4 text-[#b42318]"
                  >
                    <p>{{ notificationError }}</p>
                    <button
                      type="button"
                      class="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#344054] shadow-sm hover:bg-[#f7f4ed]"
                      @click="loadNotifications"
                    >
                      Réessayer
                    </button>
                  </div>
                  <div
                    v-else-if="notifications.length <= 0"
                    class="rounded-xl bg-[#f7f4ed] p-4 text-[#667085]"
                  >
                    Rien à traiter pour le moment.
                  </div>
                  <div
                    v-else
                    class="grid gap-2"
                  >
                    <article
                      v-for="notification in notifications"
                      :key="notification.id"
                      class="rounded-xl border border-[#eee8dd] bg-[#fbfaf7] p-3"
                      :class="notification.lue ? 'opacity-70' : 'border-[#f0c7bd] bg-[#fff7ed]'"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="truncate font-black text-[#101828]">{{ notification.titre }}</p>
                          <p class="mt-1 line-clamp-2 text-xs leading-5 text-[#667085]">{{ notification.message }}</p>
                          <p class="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#98a2b3]">
                            {{ notification.type }} · {{ formatNotificationDate(notification.created_at) }}
                          </p>
                        </div>
                        <button
                          v-if="!notification.lue"
                          type="button"
                          class="shrink-0 rounded-lg border border-[#e6e1d8] bg-white px-2 py-1 text-[0.68rem] font-black text-[#0f5a3d] shadow-sm hover:bg-[#eaf5ee]"
                          @click="markNotificationAsRead(notification)"
                        >
                          Lu
                        </button>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
            <BaseThemeToggle />
            <NuxtLink
              to="/"
              class="hidden rounded-xl border border-[#e6e1d8] bg-white px-3 py-2 text-sm font-semibold text-[#344054] shadow-sm transition hover:bg-[#f7f4ed] lg:inline-flex"
            >
              Site public
            </NuxtLink>
          </div>
        </div>
      </header>

      <main id="admin-main-content" tabindex="-1" class="px-4 py-5 lg:px-7">
        <slot />
      </main>
    </div>
  </div>
</template>
