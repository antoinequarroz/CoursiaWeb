<script setup lang="ts">
import { productUnitSchema, type ProductInput } from '#shared/validation/retail-catalog'

definePageMeta({
  layout: 'admin',
})

type ProductOffer = {
  id: string
  retailer_id: string
  retailer_name: string
  retailer_slug: string
  format: string
  quantity: number
  unit: string
  active: boolean
  latest_price_chf?: number | string | null
  latest_price_collected_at?: string | null
}

type ProductRow = {
  id: string
  name: string
  slug: string
  status: 'active' | 'archived'
  format: ProductInput['format']
  source: string
  created_at?: string | null
  offer_count?: number
  active_offer_count?: number
  offers?: ProductOffer[]
  offer?: {
    id?: string
  }
  mobile?: {
    table?: string
    aisle?: string | null
    ingredientId?: string | null
  }
}

type RetailerRow = {
  id: string
  name: string
  slug: string
}

const route = useRoute()
const router = useRouter()
const unitOptions = productUnitSchema.options

const createEmptyForm = (): ProductInput => ({
  retailerId: '',
  name: '',
  slug: '',
  brand: '',
  status: 'active',
  format: {
    label: '500 g',
    quantity: 500,
    unit: 'g',
  },
  source: 'saisie_admin',
})

const filters = reactive({
  search: '',
  retailerId: typeof route.query.retailerId === 'string' ? route.query.retailerId : '',
})

const form = reactive<ProductInput>(createEmptyForm())
const firstPrice = reactive({
  enabled: true,
  amountChf: 0,
  unitPriceChf: undefined as number | undefined,
  promotionLabel: '',
  source: 'saisie_manuelle',
  collectedAt: new Date().toISOString(),
})

const products = ref<ProductRow[]>([])
const retailers = ref<RetailerRow[]>([])
const selectedProduct = ref<ProductRow | null>(null)
const editorOpen = ref(false)
const editingProductId = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const feedback = ref('')
const errorMessage = ref('')

const productQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }
  if (filters.search.trim()) query.search = filters.search.trim()
  if (filters.retailerId) query.retailerId = filters.retailerId
  return query
})

const selectedRetailerName = computed(() =>
  retailers.value.find((retailer) => retailer.id === filters.retailerId)?.name ?? 'Toutes les enseignes',
)

const stats = computed(() => ({
  products: products.value.length,
  offers: products.value.reduce((sum, product) => sum + (product.offer_count ?? 0), 0),
  activeOffers: products.value.reduce((sum, product) => sum + (product.active_offer_count ?? 0), 0),
  pricedOffers: products.value.reduce(
    (sum, product) =>
      sum + (product.offers?.filter((offer) => offer.latest_price_chf !== null && offer.latest_price_chf !== undefined).length ?? 0),
    0,
  ),
  archived: products.value.filter((product) => product.status === 'archived').length,
}))

const selectedOffers = computed(() => selectedProduct.value?.offers ?? [])
const selectedLatestPrice = computed(() => selectedOffers.value.find((offer) => offer.latest_price_chf !== null && offer.latest_price_chf !== undefined))

const selectedHealthLabel = computed(() => {
  if (!selectedProduct.value) return '—'
  if (selectedProduct.value.status === 'archived') return 'Archivé'
  if (selectedOffers.value.length === 0) return 'Offre manquante'
  if (!selectedLatestPrice.value) return 'Prix manquant'
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

function formatPrice(value: unknown): string {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(numberValue)
    : 'Aucun prix'
}

function formatDate(value: string | null | undefined): string {
  return value
    ? new Date(value).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Jamais'
}

function resetForm(): void {
  Object.assign(form, createEmptyForm())
  form.retailerId = filters.retailerId || retailers.value[0]?.id || ''
  Object.assign(firstPrice, {
    enabled: true,
    amountChf: 0,
    unitPriceChf: undefined,
    promotionLabel: '',
    source: 'saisie_manuelle',
    collectedAt: new Date().toISOString(),
  })
}

async function loadRetailers(): Promise<void> {
  const response = await $fetch<{ data: RetailerRow[] }>('/api/admin/retailers', {
    query: { limit: 100 },
  })

  retailers.value = response.data
  if (!form.retailerId) {
    form.retailerId = filters.retailerId || retailers.value[0]?.id || ''
  }
}

async function loadProducts(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ProductRow[] }>('/api/admin/products', {
      query: productQuery.value,
    })

    products.value = response.data

    const requestedProductId = typeof route.query.selected === 'string' ? route.query.selected : null

    if (requestedProductId) {
      selectedProduct.value = products.value.find((product) => product.id === requestedProductId) ?? null
    } else if (selectedProduct.value) {
      selectedProduct.value = products.value.find((product) => product.id === selectedProduct.value?.id) ?? null
    }

    if (!selectedProduct.value && products.value[0]) {
      selectedProduct.value = products.value[0]
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

function selectProduct(product: ProductRow): void {
  selectedProduct.value = product
  editorOpen.value = false
  editingProductId.value = null
  void router.replace({
    query: {
      ...route.query,
      selected: product.id,
    },
  })
}

function startCreate(): void {
  selectedProduct.value = null
  editingProductId.value = null
  resetForm()
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

function startEdit(product = selectedProduct.value): void {
  if (!product) return

  const primaryOffer = product.offers?.[0]
  selectedProduct.value = product
  editingProductId.value = product.id
  Object.assign(form, {
    retailerId: primaryOffer?.retailer_id ?? filters.retailerId ?? retailers.value[0]?.id ?? '',
    name: product.name,
    slug: product.slug,
    brand: '',
    status: product.status === 'archived' ? 'archived' : 'active',
    format: {
      label: primaryOffer?.format || product.format?.label || '500 g',
      quantity: Number(primaryOffer?.quantity || product.format?.quantity || 500),
      unit: productUnitSchema.safeParse(primaryOffer?.unit).success
        ? primaryOffer?.unit as ProductInput['format']['unit']
        : product.format?.unit ?? 'g',
    },
    source: product.source || 'saisie_admin',
  })
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

function closeEditor(): void {
  editorOpen.value = false
  editingProductId.value = null
  resetForm()
}

async function saveProduct(): Promise<void> {
  saving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const endpoint = editingProductId.value ? `/api/admin/products/${editingProductId.value}` : '/api/admin/products'
    const method = editingProductId.value ? 'PUT' : 'POST'
    const response = await $fetch<{ data: ProductRow }>(endpoint, { method, body: form })
    const createdOfferId = response.data.offer?.id ?? response.data.offers?.[0]?.id

    if (!editingProductId.value && firstPrice.enabled && firstPrice.amountChf > 0) {
      if (!createdOfferId) {
        throw new Error('Produit créé, mais aucune offre magasin retournée pour enregistrer le prix.')
      }

      await $fetch('/api/admin/prices', {
        method: 'POST',
        body: {
          productId: createdOfferId,
          retailerId: form.retailerId,
          amountChf: firstPrice.amountChf,
          unitPriceChf: firstPrice.unitPriceChf || undefined,
          promotionLabel: firstPrice.promotionLabel || undefined,
          source: firstPrice.source,
          collectedAt: firstPrice.collectedAt,
        },
      })
    }

    feedback.value = editingProductId.value
      ? 'Produit et offre magasin mis à jour.'
      : firstPrice.enabled && firstPrice.amountChf > 0
        ? 'Produit, offre magasin et premier prix créés.'
        : 'Produit et offre magasin créés.'
    selectedProduct.value = response.data
    editorOpen.value = false
    editingProductId.value = null
    await loadProducts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function clearFilters(): Promise<void> {
  filters.search = ''
  filters.retailerId = ''
  void router.replace({
    query: {
      selected: selectedProduct.value?.id,
    },
  })
  await loadProducts()
}

watch(
  () => form.name,
  (name) => {
    if (!editingProductId.value && !form.slug) {
      form.slug = toSlug(name)
    }
  },
)

onMounted(async () => {
  await loadRetailers()
  await loadProducts()
})
</script>

<template>
  <section class="admin-page">
    <AdminPageHeader
      eyebrow="COUR-102 · produits"
      title="Produits et offres magasin"
      description="Référentiel des produits canoniques reliés aux enseignes. Ces offres servent aux prix, au comparateur et aux paniers de l’application mobile."
    >
      <template #actions>
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadProducts">
          {{ loading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
        <BaseButton type="button" :disabled="retailers.length === 0" @click="startCreate">
          Nouveau produit
        </BaseButton>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-5">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Produits</p>
        <p class="admin-stat-value">{{ stats.products }}</p>
        <p class="admin-stat-caption">catalogue filtré</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Offres</p>
        <p class="admin-stat-value">{{ stats.offers }}</p>
        <p class="admin-stat-caption">liens enseignes</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Actives</p>
        <p class="admin-stat-value">{{ stats.activeOffers }}</p>
        <p class="admin-stat-caption">exploitables mobile</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Avec prix</p>
        <p class="admin-stat-value">{{ stats.pricedOffers }}</p>
        <p class="admin-stat-caption">prix historique</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Archivés</p>
        <p class="admin-stat-value">{{ stats.archived }}</p>
        <p class="admin-stat-caption">hors catalogue actif</p>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto]" @submit.prevent="loadProducts">
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Nom produit ou rayon..." autocomplete="off">
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
        Enseigne
        <select v-model="filters.retailerId">
          <option value="">Toutes les enseignes</option>
          <option v-for="retailer in retailers" :key="retailer.id" :value="retailer.id">
            {{ retailer.name }}
          </option>
        </select>
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton v-if="filters.search || filters.retailerId" type="button" variant="ghost" @click="clearFilters">Effacer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="overflow-hidden rounded-3xl border border-[#e6e1d8] bg-coursia-surface dark:border-white/10 dark:bg-[#111827]">
        <div class="flex items-center justify-between gap-4 border-b border-[#ece6dc] px-5 py-4 dark:border-white/10">
          <div>
            <h2 class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Catalogue produits</h2>
            <p class="mt-1 text-xs text-[#667085] dark:text-[#a8b8ad]">{{ selectedRetailerName }} · {{ products.length }} produit(s)</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Données réelles' }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-5 text-sm text-[#667085] dark:text-[#a8b8ad]">
          Chargement des produits...
        </div>

        <AdminEmptyState
          v-else-if="products.length === 0"
          icon="products"
          title="Aucun produit trouvé"
          description="Crée un produit avec une enseigne pour générer une offre magasin utilisable par le comparateur."
        >
          <template #actions>
            <BaseButton v-if="filters.search || filters.retailerId" type="button" variant="secondary" @click="clearFilters">
              Réinitialiser
            </BaseButton>
            <BaseButton type="button" :disabled="retailers.length === 0" @click="startCreate">Créer</BaseButton>
          </template>
        </AdminEmptyState>

        <div v-else class="grid gap-2 p-4">
          <button
            v-for="product in products"
            :key="product.id"
            type="button"
            class="cursor-pointer rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-coursia-primary/35 dark:hover:bg-white/10"
            :class="selectedProduct?.id === product.id ? 'border-coursia-primary bg-[#eef7f1] dark:bg-coursia-primary/15' : 'border-[#e6e1d8] bg-[#fbf8f1] dark:border-white/10 dark:bg-white/5'"
            @click="selectProduct(product)"
          >
            <span class="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.9fr)_10rem] md:items-center">
              <span class="min-w-0">
                <span class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ product.name }}</span>
                  <BaseBadge v-if="product.status === 'archived'" tone="neutral">Archivé</BaseBadge>
                </span>
                <span class="mt-1 block truncate font-mono text-xs text-[#667085] dark:text-[#a8b8ad]">
                  {{ product.slug }}
                </span>
              </span>

              <span class="flex min-w-0 flex-wrap gap-1.5">
                <BaseBadge
                  v-for="offer in product.offers?.slice(0, 3)"
                  :key="offer.id"
                  :tone="offer.active ? 'primary' : 'neutral'"
                >
                  {{ offer.retailer_name }} · {{ offer.format }}
                </BaseBadge>
                <span v-if="!product.offers?.length" class="text-xs font-medium text-[#667085] dark:text-[#a8b8ad]">
                  Aucune offre
                </span>
              </span>

              <span class="text-right">
                <span class="block text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">
                  {{ formatPrice(product.offers?.find((offer) => offer.latest_price_chf)?.latest_price_chf) }}
                </span>
                <span class="mt-1 block text-xs text-[#667085] dark:text-[#a8b8ad]">
                  {{ product.mobile?.aisle || 'Rayon non classé' }}
                </span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <aside class="grid gap-4">
        <section v-if="editorOpen" class="rounded-3xl border border-[#e6e1d8] bg-coursia-surface p-5 dark:border-white/10 dark:bg-[#111827]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">
                {{ editingProductId ? 'Modification' : 'Création' }}
              </p>
              <h2 class="mt-2 text-lg font-semibold text-[#101828] dark:text-[#f7fbf8]">Produit + offre</h2>
            </div>
            <button
              type="button"
              class="cursor-pointer rounded-xl px-3 py-2 text-sm font-semibold text-[#667085] transition hover:bg-[#f7f4ed] dark:text-[#a8b8ad] dark:hover:bg-white/10"
              @click="closeEditor"
            >
              Fermer
            </button>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="saveProduct">
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
              Enseigne
              <select v-model="form.retailerId" required>
                <option value="" disabled>Choisir une enseigne</option>
                <option v-for="retailer in retailers" :key="retailer.id" :value="retailer.id">
                  {{ retailer.name }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
              Nom produit
              <input v-model="form.name" required placeholder="Ex. Penne rigate">
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
              Slug
              <input v-model="form.slug" required placeholder="penne-rigate-500g">
            </label>

            <div class="grid grid-cols-[1fr_0.65fr_0.55fr] gap-2">
              <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                Format
                <input v-model="form.format.label" required placeholder="500 g">
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                Quantité
                <input v-model.number="form.format.quantity" required type="number" min="0.01" step="0.01">
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                Unité
                <select v-model="form.format.unit">
                  <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
                </select>
              </label>
            </div>

            <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
              Source
              <input v-model="form.source" required placeholder="saisie_admin, coop.ch...">
            </label>

            <div v-if="!editingProductId" class="rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-3 dark:border-white/10 dark:bg-white/5">
              <label class="flex cursor-pointer items-start gap-3 text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">
                <input v-model="firstPrice.enabled" type="checkbox" class="mt-1 h-4 w-4 cursor-pointer accent-coursia-primary">
                <span>
                  Ajouter directement le premier prix
                  <span class="mt-1 block text-xs font-medium leading-5 text-[#667085] dark:text-[#a8b8ad]">
                    Utile pour rendre l’offre immédiatement exploitable par le comparateur mobile.
                  </span>
                </span>
              </label>

              <div v-if="firstPrice.enabled" class="mt-3 grid gap-3">
                <div class="grid grid-cols-2 gap-2">
                  <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                    Prix CHF
                    <input v-model.number="firstPrice.amountChf" type="number" min="0" step="0.01" placeholder="2.40">
                  </label>
                  <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                    Prix unitaire
                    <input v-model.number="firstPrice.unitPriceChf" type="number" min="0" step="0.01" placeholder="Optionnel">
                  </label>
                </div>
                <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                  Promotion
                  <input v-model="firstPrice.promotionLabel" placeholder="Action 20%, 2 pour 1...">
                </label>
                <div class="grid grid-cols-[1fr_1.1fr] gap-2">
                  <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                    Source prix
                    <input v-model="firstPrice.source" required>
                  </label>
                  <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                    Collecte
                    <input v-model="firstPrice.collectedAt" required>
                  </label>
                </div>
              </div>
            </div>

            <div class="rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-3 dark:border-white/10 dark:bg-white/5">
              <p class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Impact mobile</p>
              <p class="mt-1 text-xs leading-5 text-[#667085] dark:text-[#a8b8ad]">
                La sauvegarde crée ou met à jour le produit canonique et son offre magasin. Si un prix est renseigné, il est historisé côté mobile.
              </p>
            </div>

            <div class="flex flex-wrap gap-2 border-t border-[#ece6dc] pt-4 dark:border-white/10">
              <BaseButton type="submit" :disabled="saving || !form.retailerId">
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </BaseButton>
              <BaseButton type="button" variant="secondary" @click="closeEditor">Annuler</BaseButton>
            </div>
          </form>
        </section>

        <section v-else class="rounded-3xl border border-[#e6e1d8] bg-coursia-surface p-5 dark:border-white/10 dark:bg-[#111827]">
          <div v-if="!selectedProduct" class="grid place-items-center rounded-2xl bg-[#fbf8f1] p-8 text-center dark:bg-white/5">
            <div>
              <p class="font-semibold text-[#101828] dark:text-[#f7fbf8]">Sélectionne un produit</p>
              <p class="mt-2 text-sm text-[#667085] dark:text-[#a8b8ad]">Ses offres magasin et son dernier prix apparaîtront ici.</p>
            </div>
          </div>

          <template v-else>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="truncate text-lg font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ selectedProduct.name }}</h2>
                <p class="mt-1 truncate font-mono text-sm text-[#667085] dark:text-[#a8b8ad]">{{ selectedProduct.slug }}</p>
              </div>
              <BaseBadge :tone="selectedHealthLabel === 'Exploitable' ? 'success' : selectedHealthLabel === 'Prix manquant' ? 'warning' : 'neutral'">
                {{ selectedHealthLabel }}
              </BaseBadge>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">
                <dt class="text-xs font-semibold text-[#667085] dark:text-[#a8b8ad]">Offres</dt>
                <dd class="mt-1 font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ selectedOffers.length }}</dd>
              </div>
              <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">
                <dt class="text-xs font-semibold text-[#667085] dark:text-[#a8b8ad]">Actives</dt>
                <dd class="mt-1 font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ selectedProduct.active_offer_count ?? 0 }}</dd>
              </div>
              <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">
                <dt class="text-xs font-semibold text-[#667085] dark:text-[#a8b8ad]">Dernier prix</dt>
                <dd class="mt-1 font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ formatPrice(selectedLatestPrice?.latest_price_chf) }}</dd>
              </div>
              <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">
                <dt class="text-xs font-semibold text-[#667085] dark:text-[#a8b8ad]">Rayon</dt>
                <dd class="mt-1 truncate font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ selectedProduct.mobile?.aisle || 'Non classé' }}</dd>
              </div>
            </dl>

            <div class="mt-4 grid gap-2">
              <article
                v-for="offer in selectedOffers"
                :key="offer.id"
                class="rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-3 dark:border-white/10 dark:bg-white/5"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ offer.retailer_name }}</p>
                    <p class="mt-1 text-xs text-[#667085] dark:text-[#a8b8ad]">{{ offer.format }} · {{ offer.quantity }} {{ offer.unit }}</p>
                  </div>
                  <BaseBadge :tone="offer.active ? 'success' : 'neutral'">
                    {{ offer.active ? 'Active' : 'Inactive' }}
                  </BaseBadge>
                </div>
                <p class="mt-3 text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ formatPrice(offer.latest_price_chf) }}</p>
                <p class="mt-1 text-xs text-[#667085] dark:text-[#a8b8ad]">Collecte : {{ formatDate(offer.latest_price_collected_at) }}</p>
              </article>
              <p v-if="selectedOffers.length === 0" class="rounded-2xl bg-[#fbf8f1] p-4 text-sm text-[#667085] dark:bg-white/5 dark:text-[#a8b8ad]">
                Aucune offre liée. Modifie ce produit pour créer une offre magasin.
              </p>
            </div>

            <div class="mt-4 grid gap-2">
              <BaseButton type="button" @click="startEdit()">Modifier produit/offre</BaseButton>
              <NuxtLink
                class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-[#e6e1d8] bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f7f4ed] dark:border-white/10 dark:bg-white/5 dark:text-[#dbe7df] dark:hover:bg-white/10"
                :to="`/admin/prix${selectedOffers[0] ? `?productOfferId=${selectedOffers[0].id}&retailerId=${selectedOffers[0].retailer_id}` : ''}`"
              >
                Ajouter un prix
              </NuxtLink>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </section>
</template>
