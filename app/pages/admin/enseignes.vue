<script setup lang="ts">
import type { RetailerInput } from '#shared/validation/retail-catalog'

definePageMeta({
  layout: 'admin',
})

type RetailerRow = {
  id: string
  name: string
  slug: string
  status: 'active'
  offer_count?: number
  active_offer_count?: number
  price_count?: number
  mobile?: {
    table?: string
    code?: string
    name?: string
  }
}

type RetailerForm = Pick<RetailerInput, 'name' | 'slug'>

const filters = reactive({
  search: '',
})

const route = useRoute()
const router = useRouter()

const form = reactive<RetailerForm>({
  name: '',
  slug: '',
})

const retailers = ref<RetailerRow[]>([])
const selectedRetailer = ref<RetailerRow | null>(null)
const editorOpen = ref(false)
const editingRetailerId = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const feedback = ref('')
const errorMessage = ref('')

const retailerQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }
  if (filters.search.trim()) query.search = filters.search.trim()
  return query
})

const stats = computed(() => ({
  retailers: retailers.value.length,
  offers: retailers.value.reduce((sum, retailer) => sum + (retailer.offer_count ?? 0), 0),
  activeOffers: retailers.value.reduce((sum, retailer) => sum + (retailer.active_offer_count ?? 0), 0),
  prices: retailers.value.reduce((sum, retailer) => sum + (retailer.price_count ?? 0), 0),
  emptyRetailers: retailers.value.filter((retailer) => (retailer.offer_count ?? 0) === 0).length,
}))

const selectedCoverage = computed(() => {
  if (!selectedRetailer.value) return 0
  const offers = selectedRetailer.value.offer_count ?? 0
  if (offers === 0) return 0
  return Math.round(((selectedRetailer.value.active_offer_count ?? 0) / offers) * 100)
})

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const resetForm = () => {
  Object.assign(form, {
    name: '',
    slug: '',
  })
}

const selectRetailer = (retailer: RetailerRow) => {
  selectedRetailer.value = retailer
  editorOpen.value = false
  editingRetailerId.value = null
  void router.replace({
    query: {
      ...route.query,
      selected: retailer.id,
    },
  })
}

const startCreate = () => {
  selectedRetailer.value = null
  editingRetailerId.value = null
  resetForm()
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

const startEdit = (retailer = selectedRetailer.value) => {
  if (!retailer) return

  selectedRetailer.value = retailer
  editingRetailerId.value = retailer.id
  Object.assign(form, {
    name: retailer.name,
    slug: retailer.slug,
  })
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

const closeEditor = () => {
  editorOpen.value = false
  editingRetailerId.value = null
  resetForm()
}

const loadRetailers = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: RetailerRow[] }>('/api/admin/retailers', {
      query: retailerQuery.value,
    })

    retailers.value = response.data

    const requestedId = typeof route.query.selected === 'string'
      ? route.query.selected
      : typeof route.query.retailerId === 'string'
        ? route.query.retailerId
        : null

    if (requestedId) {
      selectedRetailer.value = retailers.value.find((retailer) => retailer.id === requestedId) ?? null
    } else if (selectedRetailer.value) {
      selectedRetailer.value = retailers.value.find((retailer) => retailer.id === selectedRetailer.value?.id) ?? null
    }

    if (!selectedRetailer.value && retailers.value[0]) {
      selectedRetailer.value = retailers.value[0]
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

const saveRetailer = async () => {
  saving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const payload: RetailerInput = {
      name: form.name,
      slug: form.slug,
      status: 'active',
      websiteUrl: undefined,
    }
    const endpoint = editingRetailerId.value ? `/api/admin/retailers/${editingRetailerId.value}` : '/api/admin/retailers'
    const method = editingRetailerId.value ? 'PUT' : 'POST'
    const response = await $fetch<{ data: RetailerRow }>(endpoint, { method, body: payload })

    feedback.value = editingRetailerId.value ? 'Enseigne modifiée.' : 'Enseigne créée.'
    selectedRetailer.value = response.data
    editorOpen.value = false
    editingRetailerId.value = null
    await loadRetailers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

const clearFilters = async () => {
  filters.search = ''
  await loadRetailers()
}

watch(
  () => form.name,
  (name) => {
    if (!editingRetailerId.value && !form.slug) {
      form.slug = toSlug(name)
    }
  },
)

onMounted(loadRetailers)
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">Comparateur</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Enseignes
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-coursia-muted">
          Référentiel des magasins utilisés par les offres, les prix et les paniers de l’application mobile.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadRetailers">
          Rafraîchir
        </BaseButton>
        <BaseButton type="button" @click="startCreate">
          Nouvelle enseigne
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-5">
      <article class="admin-stat-card">
        <span>Enseignes</span>
        <strong>{{ stats.retailers }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Offres</span>
        <strong class="text-coursia-primary">{{ stats.offers }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Actives</span>
        <strong class="text-coursia-success">{{ stats.activeOffers }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Prix</span>
        <strong>{{ stats.prices }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Sans offre</span>
        <strong class="text-coursia-warning">{{ stats.emptyRetailers }}</strong>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1fr_auto]" @submit.prevent="loadRetailers">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Coop, Migros, Aldi..." />
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton v-if="filters.search" type="button" variant="ghost" @click="clearFilters">Effacer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-semibold text-coursia-text">Catalogue magasins</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ retailers.length }} enseigne(s) affichée(s)</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Données réelles' }}</BaseBadge>
        </div>

        <div v-if="loading" class="mt-4 rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
          Chargement des enseignes...
        </div>

        <div v-else-if="retailers.length === 0" class="mt-4 grid place-items-center rounded-2xl bg-coursia-surface-muted p-10 text-center">
          <div class="max-w-sm">
            <p class="font-semibold text-coursia-text">Aucune enseigne trouvée</p>
            <p class="mt-2 text-sm text-coursia-muted">
              Crée la première enseigne avant d’ajouter des produits et des prix.
            </p>
            <BaseButton class="mt-4" type="button" @click="startCreate">Créer une enseigne</BaseButton>
          </div>
        </div>

        <div v-else class="mt-4 grid gap-2">
          <button
            v-for="retailer in retailers"
            :key="retailer.id"
            type="button"
            class="cursor-pointer rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-coursia-sm"
            :class="selectedRetailer?.id === retailer.id ? 'border-coursia-primary bg-coursia-primary/10' : 'border-coursia-border bg-coursia-surface-muted'"
            @click="selectRetailer(retailer)"
          >
            <span class="flex items-start justify-between gap-3">
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-coursia-text">{{ retailer.name }}</span>
                <span class="mt-1 block truncate text-xs text-coursia-muted">
                  Code mobile : {{ retailer.slug }}
                </span>
              </span>
              <span class="flex shrink-0 items-center gap-2">
                <BaseBadge :tone="(retailer.active_offer_count ?? 0) > 0 ? 'primary' : 'neutral'">
                  {{ retailer.active_offer_count ?? 0 }} offre(s)
                </BaseBadge>
                <BaseBadge :tone="(retailer.price_count ?? 0) > 0 ? 'success' : 'warning'">
                  {{ retailer.price_count ?? 0 }} prix
                </BaseBadge>
              </span>
            </span>
          </button>
        </div>
      </section>

      <aside class="grid gap-4">
        <section v-if="editorOpen" class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">
                {{ editingRetailerId ? 'Modification' : 'Création' }}
              </p>
              <h2 class="mt-2 text-lg font-semibold text-coursia-text">Fiche enseigne</h2>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-coursia-muted transition hover:bg-coursia-surface-muted"
              @click="closeEditor"
            >
              Fermer
            </button>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="saveRetailer">
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Nom public
              <input v-model="form.name" required placeholder="Ex. Coop" />
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Code technique
              <input v-model="form.slug" required placeholder="coop" />
            </label>

            <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-semibold text-coursia-text">Impact comparateur</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">
                Le code est utilisé pour relier offres, prix et imports CSV. Évite de le modifier si des produits
                existent déjà pour cette enseigne.
              </p>
            </div>

            <div class="flex flex-wrap gap-2 border-t border-coursia-border pt-4">
              <BaseButton type="submit" :disabled="saving">
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </BaseButton>
              <BaseButton type="button" variant="secondary" @click="closeEditor">Annuler</BaseButton>
            </div>
          </form>
        </section>

        <section v-else class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div v-if="!selectedRetailer" class="grid place-items-center rounded-2xl bg-coursia-surface-muted p-8 text-center">
            <div>
              <p class="font-semibold text-coursia-text">Sélectionne une enseigne</p>
              <p class="mt-2 text-sm text-coursia-muted">Le détail et les liens de travail apparaîtront ici.</p>
            </div>
          </div>

          <template v-else>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="truncate text-lg font-semibold text-coursia-text">{{ selectedRetailer.name }}</h2>
                <p class="mt-1 truncate text-sm text-coursia-muted">Code : {{ selectedRetailer.slug }}</p>
              </div>
              <BaseBadge tone="success">Active</BaseBadge>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-semibold text-coursia-muted">Offres totales</dt>
                <dd class="mt-1 font-semibold text-coursia-text">{{ selectedRetailer.offer_count ?? 0 }}</dd>
              </div>
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-semibold text-coursia-muted">Prix historisés</dt>
                <dd class="mt-1 font-semibold text-coursia-text">{{ selectedRetailer.price_count ?? 0 }}</dd>
              </div>
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-semibold text-coursia-muted">Offres actives</dt>
                <dd class="mt-1 font-semibold text-coursia-text">{{ selectedRetailer.active_offer_count ?? 0 }}</dd>
              </div>
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-semibold text-coursia-muted">Couverture</dt>
                <dd class="mt-1 font-semibold text-coursia-text">{{ selectedCoverage }}%</dd>
              </div>
            </dl>

            <div class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-semibold text-coursia-text">Prochaine action utile</p>
              <p v-if="(selectedRetailer.offer_count ?? 0) === 0" class="mt-1 text-xs leading-5 text-coursia-muted">
                Ajoute au moins une offre produit pour que cette enseigne soit exploitable dans le comparateur.
              </p>
              <p v-else-if="(selectedRetailer.price_count ?? 0) === 0" class="mt-1 text-xs leading-5 text-coursia-muted">
                Ajoute les premiers prix pour rendre les offres utilisables côté mobile.
              </p>
              <p v-else class="mt-1 text-xs leading-5 text-coursia-muted">
                L’enseigne est prête pour le comparateur. Continue la maintenance des produits ou prix.
              </p>
            </div>

            <div class="mt-4 grid gap-2">
              <BaseButton type="button" @click="startEdit()">Modifier l’enseigne</BaseButton>
              <NuxtLink
                class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-foreground transition hover:bg-coursia-surface-muted"
                :to="`/admin/produits?retailerId=${selectedRetailer.id}`"
              >
                Gérer les produits liés
              </NuxtLink>
              <NuxtLink
                class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-foreground transition hover:bg-coursia-surface-muted"
                :to="`/admin/prix?retailerId=${selectedRetailer.id}`"
              >
                Gérer les prix
              </NuxtLink>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </section>
</template>
