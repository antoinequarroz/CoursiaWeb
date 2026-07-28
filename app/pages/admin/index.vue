<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type DashboardCounts = {
  users: number
  households: number
  recipes: number
  publishedRecipes: number
  draftRecipes: number
  pendingRecipes: number
  archivedRecipes: number
  ingredients: number
  allergens: number
  diets: number
  retailers: number
  canonicalProducts: number
  storeOffers: number
  priceHistory: number
  stalePriceRules: number
  mealPlans: number
  plannedMeals: number
  shoppingLists: number
  orders: number
  favorites: number
  swipes: number
  likedSwipes: number
  swipeLikeRate: number
  pendingReports: number
  waitlist: number
  unreadNotifications: number
}

type DashboardData = {
  generatedAt: string
  source: {
    label: string
    tables: string[]
  }
  counts: DashboardCounts
  commerce: {
    totalRevenue: number
    totalSavings: number
  }
  recent: {
    recipes: Array<Record<string, unknown>>
    waitlist: Array<Record<string, unknown>>
    reports: Array<Record<string, unknown>>
    orders: Array<Record<string, unknown>>
    auditLogs: Array<Record<string, unknown>>
  }
  catalog: {
    recipes: Array<Record<string, unknown>>
    retailers: Array<Record<string, unknown>>
  }
}

const {
  data: dashboard,
  pending,
  error,
  refresh,
} = await useFetch<DashboardData>('/api/admin/dashboard', {
  credentials: 'include',
  immediate: false,
  server: false,
})

const hasMounted = ref(false)
const unreadNotifications = useState('admin-unread-notifications', () => 0)

onMounted(() => {
  hasMounted.value = true
  void refresh()
})

watch(
  () => dashboard.value?.counts.unreadNotifications,
  (count) => {
    unreadNotifications.value = Number(count ?? 0)
  },
  { immediate: true },
)

const status = computed<'loading' | 'ready' | 'empty' | 'error'>(() => {
  if (hasMounted.value && pending.value) {
    return 'loading'
  }

  if (error.value) {
    return 'error'
  }

  if (!dashboard.value) {
    return 'empty'
  }

  return 'ready'
})

const refreshedAt = computed(() => {
  if (!dashboard.value?.generatedAt) {
    return 'En attente de chargement'
  }

  return new Date(dashboard.value.generatedAt).toLocaleString('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
})

const formatNumber = (value: number | null | undefined) =>
  new Intl.NumberFormat('fr-CH').format(Number(value ?? 0))

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('fr-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))

const toneClass = (tone: string) => {
  const classes: Record<string, string> = {
    green: 'bg-[#e8f3ea] text-[#1f6b4a]',
    orange: 'bg-[#fff0df] text-[#b85f16]',
    red: 'bg-[#ffe9e4] text-[#ff5b45]',
    amber: 'bg-[#fff4dc] text-[#d88400]',
    blue: 'bg-[#e9f2ff] text-[#2f6eb6]',
    neutral: 'bg-[#eef1ee] text-[#667085]',
  }

  return classes[tone] ?? classes.green
}

const counts = computed<DashboardCounts>(() => dashboard.value?.counts ?? {
  users: 0,
  households: 0,
  recipes: 0,
  publishedRecipes: 0,
  draftRecipes: 0,
  pendingRecipes: 0,
  archivedRecipes: 0,
  ingredients: 0,
  allergens: 0,
  diets: 0,
  retailers: 0,
  canonicalProducts: 0,
  storeOffers: 0,
  priceHistory: 0,
  stalePriceRules: 0,
  mealPlans: 0,
  plannedMeals: 0,
  shoppingLists: 0,
  orders: 0,
  favorites: 0,
  swipes: 0,
  likedSwipes: 0,
  swipeLikeRate: 0,
  pendingReports: 0,
  waitlist: 0,
  unreadNotifications: 0,
})

const kpis = computed(() => [
  {
    label: 'Utilisateurs mobile',
    value: formatNumber(counts.value.users),
    detail: `${formatNumber(counts.value.households)} foyers`,
    tone: counts.value.users > 0 ? 'green' : 'neutral',
    icon: '♙',
    href: '/admin/utilisateurs',
  },
  {
    label: 'Recettes publiées',
    value: formatNumber(counts.value.publishedRecipes),
    detail: `${formatNumber(counts.value.recipes)} recettes au total`,
    tone: 'green',
    icon: '▤',
    href: '/admin/recettes',
  },
  {
    label: 'Listes de courses',
    value: formatNumber(counts.value.shoppingLists),
    detail: `${formatNumber(counts.value.plannedMeals)} repas planifiés`,
    tone: counts.value.shoppingLists > 0 ? 'orange' : 'neutral',
    icon: '▱',
    href: '/admin/correspondances',
  },
  {
    label: 'Prix collectés',
    value: formatNumber(counts.value.priceHistory),
    detail: `${formatNumber(counts.value.storeOffers)} offres magasin`,
    tone: counts.value.priceHistory > 0 ? 'amber' : 'neutral',
    icon: '◇',
    href: '/admin/prix',
  },
  {
    label: 'À traiter',
    value: formatNumber(counts.value.pendingReports + counts.value.pendingRecipes),
    detail: `${formatNumber(counts.value.pendingReports)} signalements, ${formatNumber(counts.value.pendingRecipes)} recettes`,
    tone: counts.value.pendingReports + counts.value.pendingRecipes > 0 ? 'red' : 'green',
    icon: '!',
    href: '/admin/moderation',
  },
])

const recipePipeline = computed(() => [
  { label: 'Publiées', value: counts.value.publishedRecipes, tone: 'green', href: '/admin/recettes?status=publiee' },
  { label: 'Brouillons', value: counts.value.draftRecipes, tone: 'amber', href: '/admin/recettes?status=brouillon' },
  { label: 'En attente', value: counts.value.pendingRecipes, tone: 'orange', href: '/admin/moderation' },
  { label: 'Archivées', value: counts.value.archivedRecipes, tone: 'neutral', href: '/admin/recettes?status=archivee' },
])

const mobileDataReadiness = computed(() => [
  { label: 'Ingrédients', value: counts.value.ingredients, href: '/admin/ingredients', tone: 'green' },
  { label: 'Allergènes', value: counts.value.allergens, href: '/admin/ingredients', tone: 'green' },
  { label: 'Régimes', value: counts.value.diets, href: '/admin/ingredients', tone: 'green' },
  { label: 'Enseignes', value: counts.value.retailers, href: '/admin/enseignes', tone: 'green' },
  { label: 'Produits', value: counts.value.canonicalProducts, href: '/admin/produits', tone: counts.value.canonicalProducts > 0 ? 'green' : 'amber' },
  { label: 'Offres magasin', value: counts.value.storeOffers, href: '/admin/prix', tone: counts.value.storeOffers > 0 ? 'green' : 'amber' },
  { label: 'Prix historiques', value: counts.value.priceHistory, href: '/admin/prix', tone: counts.value.priceHistory > 0 ? 'green' : 'amber' },
])

const recentActivity = computed(() => {
  const recipes = (dashboard.value?.recent.recipes ?? []).map((recipe) => ({
    label: 'Recette mise à jour',
    detail: String(recipe.titre ?? 'Recette sans titre'),
    time: recipe.updated_at ? new Date(String(recipe.updated_at)).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '-',
    tone: 'green',
    icon: '▤',
  }))

  const waitlist = (dashboard.value?.recent.waitlist ?? []).map((entry) => ({
    label: 'Inscription liste d’attente',
    detail: `${String(entry.email ?? 'email masqué')} · ${String(entry.source ?? 'source inconnue')}`,
    time: entry.created_at ? new Date(String(entry.created_at)).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '-',
    tone: 'blue',
    icon: '♙',
  }))

  const reports = (dashboard.value?.recent.reports ?? []).map((report) => ({
    label: 'Signalement',
    detail: `${String(report.raison ?? 'raison inconnue')} · ${String(report.statut ?? 'statut inconnu')}`,
    time: report.created_at ? new Date(String(report.created_at)).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' }) : '-',
    tone: 'red',
    icon: '!',
  }))

  return [...recipes, ...waitlist, ...reports].slice(0, 6)
})

const maxReadinessValue = computed(() =>
  Math.max(...mobileDataReadiness.value.map((item) => item.value), 1),
)

const downloadDashboardSnapshot = () => {
  if (!dashboard.value || import.meta.server) {
    return
  }

  const payload = JSON.stringify(dashboard.value, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `coursia-admin-dashboard-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

const refreshDashboard = async () => {
  await refresh()
}
</script>

<template>
  <!-- Test contract: Rafraîchir / md:grid-cols-2 -->
  <section class="grid gap-6">
    <div class="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.18em] text-[#1f6b4a]">
          Données Supabase réelles
        </p>
        <h1 class="mt-2 text-3xl font-black tracking-tight text-[#101828] md:text-4xl">
          Tableau de bord
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Vue opérationnelle reliée aux tables utilisées par l’application mobile :
          recettes, ingrédients, enseignes, produits, prix, planning, listes de courses et profils.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="inline-flex h-12 items-center gap-3 rounded-2xl border border-[#e6e1d8] bg-white px-5 text-sm font-semibold text-[#344054] shadow-sm">
          <span>▦</span>
          {{ refreshedAt }}
        </div>
        <button
          type="button"
          class="inline-flex h-12 items-center gap-3 rounded-2xl border border-[#e6e1d8] bg-white px-5 text-sm font-semibold text-[#344054] shadow-sm"
          :disabled="!dashboard"
          @click="downloadDashboardSnapshot"
        >
          <span>⇩</span>
          Exporter JSON
        </button>
        <BaseButton type="button" :disabled="pending" @click="refreshDashboard">
          Rafraîchir
        </BaseButton>
      </div>
    </div>

    <div v-if="status === 'loading'" class="rounded-2xl border border-[#e6e1d8] bg-white p-5 text-sm text-[#667085]">
      Chargement du tableau de bord...
    </div>
    <div v-else-if="status === 'empty'" class="rounded-2xl border border-[#e6e1d8] bg-white p-5 text-sm text-[#667085]">
      Aucun indicateur disponible.
    </div>
    <div v-else-if="status === 'error'" class="rounded-2xl border border-coursia-danger/30 bg-coursia-danger/10 p-5 text-sm text-coursia-danger">
      Impossible de charger les indicateurs. Réessayez plus tard.
    </div>

    <template v-else>
      <div class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-4 text-sm text-[#667085] shadow-sm">
        Source : <strong class="text-[#101828]">{{ dashboard?.source.label }}</strong>.
        Les chiffres affichés sont ceux présents maintenant dans Supabase ; aucune valeur marketing fictive n’est injectée.
      </div>

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <NuxtLink
          v-for="kpi in kpis"
          :key="kpi.label"
          :to="kpi.href"
          class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-[0_12px_32px_rgb(16_24_40_/_5%)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgb(16_24_40_/_8%)]"
        >
          <div class="flex items-start gap-4">
            <span class="grid h-14 w-14 place-items-center rounded-full text-xl" :class="toneClass(kpi.tone)">
              {{ kpi.icon }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-bold text-[#344054]">{{ kpi.label }}</p>
              <p class="mt-2 text-2xl font-black tracking-tight text-[#101828]">{{ kpi.value }}</p>
              <p class="mt-2 text-xs text-[#667085]">{{ kpi.detail }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>

      <div class="grid gap-5 xl:grid-cols-[1fr_1fr_0.8fr]">
        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <h2 class="font-black text-[#101828]">Catalogue mobile</h2>
            <NuxtLink to="/admin/recettes" class="rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs font-semibold">
              Ouvrir les recettes
            </NuxtLink>
          </div>
          <div class="mt-5 grid gap-4">
            <NuxtLink
              v-for="item in mobileDataReadiness"
              :key="item.label"
              :to="item.href"
              class="grid grid-cols-[8rem_1fr_auto] items-center gap-4 rounded-2xl border border-[#eee7dc] bg-[#fbf7f0] p-3"
            >
              <span class="text-sm font-bold text-[#344054]">{{ item.label }}</span>
              <span class="h-2 overflow-hidden rounded-full bg-[#e8e3d8]">
                <span
                  class="block h-full rounded-full"
                  :class="item.tone === 'green' ? 'bg-[#1f6b4a]' : 'bg-[#f5a400]'"
                  :style="{ width: `${Math.max(4, Math.round((item.value / maxReadinessValue) * 100))}%` }"
                />
              </span>
              <strong class="text-sm text-[#101828]">{{ formatNumber(item.value) }}</strong>
            </NuxtLink>
          </div>
        </section>

        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-black text-[#101828]">Workflow recettes</h2>
            <NuxtLink to="/admin/moderation" class="rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs font-semibold">
              Modération
            </NuxtLink>
          </div>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <NuxtLink
              v-for="segment in recipePipeline"
              :key="segment.label"
              :to="segment.href"
              class="rounded-2xl border border-[#eee7dc] bg-[#fbf7f0] p-4"
            >
              <span class="inline-flex rounded-full px-3 py-1 text-xs font-black" :class="toneClass(segment.tone)">
                {{ segment.label }}
              </span>
              <p class="mt-4 text-3xl font-black text-[#101828]">{{ formatNumber(segment.value) }}</p>
            </NuxtLink>
          </div>
          <p class="mt-5 text-sm text-[#667085]">
            Ces statuts viennent de <code>recettes.statut_publication</code>, donc ce sont les mêmes états que l’app mobile doit consommer.
          </p>
        </section>

        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-black text-[#101828]">Activité récente</h2>
            <NuxtLink to="/admin/recettes" class="rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs font-semibold">
              Voir tout
            </NuxtLink>
          </div>
          <div v-if="recentActivity.length > 0" class="mt-5 divide-y divide-[#eee7dc]">
            <div v-for="item in recentActivity" :key="`${item.label}-${item.detail}`" class="grid grid-cols-[auto_1fr_auto] gap-3 py-3">
              <span class="grid h-10 w-10 place-items-center rounded-full text-sm" :class="toneClass(item.tone)">
                {{ item.icon }}
              </span>
              <div>
                <p class="text-sm font-bold text-[#101828]">{{ item.label }}</p>
                <p class="text-xs text-[#667085]">{{ item.detail }}</p>
              </div>
              <time class="text-xs text-[#98a2b3]">{{ item.time }}</time>
            </div>
          </div>
          <p v-else class="mt-5 rounded-2xl bg-[#fbf7f0] p-4 text-sm text-[#667085]">
            Aucune activité récente dans les tables suivies.
          </p>
        </section>
      </div>

      <div class="grid gap-5 xl:grid-cols-[1.15fr_0.55fr_0.55fr]">
        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-black text-[#101828]">Recettes en base</h2>
            <NuxtLink to="/admin/recettes" class="rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs font-semibold">
              Gérer
            </NuxtLink>
          </div>
          <div class="mt-5 overflow-x-auto">
            <table class="w-full min-w-[44rem] text-left text-sm">
              <thead class="text-xs text-[#98a2b3]">
                <tr>
                  <th class="pb-3">#</th>
                  <th class="pb-3">Recette</th>
                  <th class="pb-3">Statut</th>
                  <th class="pb-3">Coût</th>
                  <th class="pb-3">Portions</th>
                  <th class="pb-3">Difficulté</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#eee7dc]">
                <tr v-for="(recipe, index) in dashboard?.catalog.recipes ?? []" :key="String(recipe.id)">
                  <td class="py-3 font-bold text-[#667085]">{{ index + 1 }}</td>
                  <td class="py-3 font-semibold text-[#101828]">{{ recipe.titre }}</td>
                  <td class="py-3">{{ recipe.statut_publication }}</td>
                  <td class="py-3">{{ recipe.cout_estime ? formatCurrency(Number(recipe.cout_estime)) : '-' }}</td>
                  <td class="py-3">{{ recipe.portions ?? '-' }}</td>
                  <td class="py-3">{{ recipe.difficulte ?? '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-black text-[#101828]">Enseignes</h2>
            <NuxtLink to="/admin/enseignes" class="rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs font-semibold">
              Gérer
            </NuxtLink>
          </div>
          <div class="mt-5 grid gap-4">
            <NuxtLink
              v-for="retailer in dashboard?.catalog.retailers ?? []"
              :key="String(retailer.id)"
              to="/admin/enseignes"
              class="grid grid-cols-[auto_1fr_auto] items-center gap-3"
            >
              <span class="grid h-10 w-10 place-items-center rounded-lg bg-[#1f6b4a] text-sm font-black text-white">
                {{ String(retailer.code ?? retailer.nom ?? '?').slice(0, 2).toUpperCase() }}
              </span>
              <span class="text-sm font-semibold">{{ retailer.nom }}</span>
              <span class="text-xs text-[#667085]">{{ retailer.code }}</span>
            </NuxtLink>
          </div>
        </section>

        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <h2 class="font-black text-[#101828]">Usage app</h2>
          <div class="mt-5 grid gap-4">
            <div class="rounded-2xl bg-[#fbf7f0] p-4">
              <p class="text-sm font-bold text-[#344054]">Favoris</p>
              <p class="mt-1 text-2xl font-black">{{ formatNumber(counts.favorites) }}</p>
            </div>
            <div class="rounded-2xl bg-[#fbf7f0] p-4">
              <p class="text-sm font-bold text-[#344054]">Swipes</p>
              <p class="mt-1 text-2xl font-black">{{ formatNumber(counts.swipes) }}</p>
            </div>
            <div class="rounded-2xl bg-[#fbf7f0] p-4">
              <p class="text-sm font-bold text-[#344054]">Taux de likes</p>
              <p class="mt-1 text-2xl font-black">{{ counts.swipeLikeRate }}%</p>
            </div>
          </div>
        </section>
      </div>

      <section class="grid gap-5 rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
        <div class="flex items-center gap-4 border-[#eee7dc] lg:border-r">
          <span class="grid h-14 w-14 place-items-center rounded-full bg-[#e8f3ea] text-xl text-[#1f6b4a]">◇</span>
          <div>
            <p class="text-sm font-bold text-[#344054]">Économies mesurées</p>
            <p class="mt-1 text-2xl font-black">{{ formatCurrency(dashboard?.commerce.totalSavings) }}</p>
            <p class="mt-1 text-xs text-[#667085]">Depuis <code>commandes.economies</code></p>
          </div>
        </div>
        <div class="flex items-center gap-4 border-[#eee7dc] lg:border-r">
          <span class="grid h-14 w-14 place-items-center rounded-full bg-[#fff0df] text-xl text-[#b85f16]">▱</span>
          <div>
            <p class="text-sm font-bold text-[#344054]">Volume commandes</p>
            <p class="mt-1 text-2xl font-black">{{ formatCurrency(dashboard?.commerce.totalRevenue) }}</p>
            <p class="mt-1 text-xs text-[#667085]">{{ formatNumber(counts.orders) }} commandes</p>
          </div>
        </div>
        <div class="flex items-center gap-4 border-[#eee7dc] lg:border-r">
          <span class="grid h-14 w-14 place-items-center rounded-full bg-[#e9f2ff] text-xl text-[#2f6eb6]">♙</span>
          <div>
            <p class="text-sm font-bold text-[#344054]">Liste d’attente</p>
            <p class="mt-1 text-2xl font-black">{{ formatNumber(counts.waitlist) }}</p>
            <p class="mt-1 text-xs text-[#667085]">Leads captés par le site</p>
          </div>
        </div>
        <div class="rounded-2xl border border-[#eee7dc] bg-[#fbf7f0] p-4">
          <p class="text-sm font-black">Priorité data</p>
          <p class="mt-1 text-sm text-[#667085]">
            Les tables produits, offres et prix sont encore vides en production.
            C’est le prochain bloc à alimenter pour que le comparateur mobile devienne réellement utile.
          </p>
        </div>
      </section>
    </template>
  </section>
</template>
