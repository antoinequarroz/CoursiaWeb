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

const route = useRoute()
const router = useRouter()

const filters = reactive({
  search: '',
})

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

const selectedHealthLabel = computed(() => {
  if (!selectedRetailer.value) return '—'
  if ((selectedRetailer.value.offer_count ?? 0) === 0) return 'À compléter'
  if ((selectedRetailer.value.price_count ?? 0) === 0) return 'Prix manquants'
  return 'Exploitable'
})

function toSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function resetForm(): void {
  Object.assign(form, {
    name: '',
    slug: '',
  })
}

function selectRetailer(retailer: RetailerRow): void {
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

function startCreate(): void {
  selectedRetailer.value = null
  editingRetailerId.value = null
  resetForm()
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

function startEdit(retailer = selectedRetailer.value): void {
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

function closeEditor(): void {
  editorOpen.value = false
  editingRetailerId.value = null
  resetForm()
}

async function loadRetailers(): Promise<void> {
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

async function saveRetailer(): Promise<void> {
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

async function clearFilters(): Promise<void> {
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
    <AdminPageHeader
      eyebrow="COUR-102 · comparateur"
      title="Enseignes"
      description="Référentiel des magasins utilisés par les offres, les prix et les paniers de l’application mobile. Un code stable évite de casser les imports et les correspondances produits."
    >
      <template #actions>
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadRetailers">
          {{ loading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
        <BaseButton type="button" @click="startCreate">
          Nouvelle enseigne
        </BaseButton>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-5">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Enseignes</p>
        <p class="admin-stat-value">{{ stats.retailers }}</p>
        <p class="admin-stat-caption">référentiel actif</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Offres</p>
        <p class="admin-stat-value">{{ stats.offers }}</p>
        <p class="admin-stat-caption">produits magasins</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Actives</p>
        <p class="admin-stat-value">{{ stats.activeOffers }}</p>
        <p class="admin-stat-caption">offres exploitables</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Prix</p>
        <p class="admin-stat-value">{{ stats.prices }}</p>
        <p class="admin-stat-caption">historique prix</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Sans offre</p>
        <p class="admin-stat-value">{{ stats.emptyRetailers }}</p>
        <p class="admin-stat-caption">à compléter</p>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1fr_auto]" @submit.prevent="loadRetailers">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Coop, Migros, Aldi..." autocomplete="off">
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

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="overflow-hidden rounded-3xl border border-coursia-border bg-coursia-surface">
        <div class="flex items-center justify-between gap-4 border-b border-coursia-border px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-coursia-text">Catalogue magasins</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ retailers.length }} enseigne(s) affichée(s)</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Données réelles' }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-5 text-sm text-coursia-muted">
          Chargement des enseignes...
        </div>

        <AdminEmptyState
          v-else-if="retailers.length === 0"
          icon="retailers"
          title="Aucune enseigne trouvée"
          description="Crée la première enseigne avant d’ajouter des produits et des prix."
        >
          <template #actions>
            <BaseButton class="mt-4" type="button" @click="startCreate">Créer une enseigne</BaseButton>
          </template>
        </AdminEmptyState>

        <div v-else class="grid gap-2 p-4">
          <button
            v-for="retailer in retailers"
            :key="retailer.id"
            type="button"
            class="admin-card-action rounded-2xl border p-3 text-left"
            :class="selectedRetailer?.id === retailer.id ? 'admin-card-selected' : ''"
            @click="selectRetailer(retailer)"
          >
            <span class="flex items-start justify-between gap-3">
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-coursia-text">{{ retailer.name }}</span>
                <span class="mt-1 block truncate font-mono text-xs text-coursia-muted">
                  {{ retailer.slug }}
                </span>
              </span>
              <span class="flex shrink-0 items-center gap-2">
                <BaseBadge :tone="(retailer.active_offer_count ?? 0) > 0 ? 'primary' : 'neutral'">
                  {{ retailer.active_offer_count ?? 0 }} offres
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
        <section v-if="editorOpen" class="rounded-3xl border border-coursia-border bg-coursia-surface p-5">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">
                {{ editingRetailerId ? 'Modification' : 'Création' }}
              </p>
              <h2 class="mt-2 text-lg font-semibold text-coursia-text">Fiche enseigne</h2>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-coursia-muted transition hover:bg-coursia-primary/10 hover:text-coursia-primary"
              @click="closeEditor"
            >
              Fermer
            </button>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="saveRetailer">
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Nom public
              <input v-model="form.name" required placeholder="Ex. Coop">
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Code technique
              <input v-model="form.slug" required placeholder="coop">
            </label>

            <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-semibold text-coursia-text">Impact comparateur</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">
                Le code relie offres, prix et imports CSV. Évite de le modifier si des produits existent déjà.
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

        <section v-else class="rounded-3xl border border-coursia-border bg-coursia-surface p-5">
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
                <p class="mt-1 truncate font-mono text-sm text-coursia-muted">{{ selectedRetailer.slug }}</p>
              </div>
              <BaseBadge :tone="selectedHealthLabel === 'Exploitable' ? 'success' : 'warning'">
                {{ selectedHealthLabel }}
              </BaseBadge>
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
                class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-text transition hover:border-coursia-primary/45 hover:bg-coursia-primary/10"
                :to="`/admin/produits?retailerId=${selectedRetailer.id}`"
              >
                Gérer les produits liés
              </NuxtLink>
              <NuxtLink
                class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-text transition hover:border-coursia-primary/45 hover:bg-coursia-primary/10"
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
