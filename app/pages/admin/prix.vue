<script setup lang="ts">
import { retailCsvColumns, retailCsvTemplate, type PriceEntryInput, type RetailImportPreview } from '#shared/validation/retail-catalog'

definePageMeta({
  layout: 'admin',
})

type RetailerRow = {
  id: string
  name: string
  slug: string
}

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
  offers?: ProductOffer[]
}

type PriceRow = {
  id: string
  product_id: string
  retailer_id: string
  product_name?: string
  retailer_name?: string
  retailer_slug?: string
  amount_chf: number | string
  unit_price_chf?: number | string | null
  promotion_label?: string | null
  source?: string | null
  collected_at?: string | null
  quality_status?: 'fresh' | 'stale' | 'anomaly'
  offer?: {
    id: string
    format: string
    quantity: number
    unit: string
    active: boolean
  } | null
}

type OfferOption = ProductOffer & {
  product_id: string
  product_name: string
  product_slug: string
}

const route = useRoute()
const router = useRouter()

const filters = reactive({
  retailerId: typeof route.query.retailerId === 'string' ? route.query.retailerId : '',
  quality: typeof route.query.quality === 'string' ? route.query.quality : '',
})

const createEmptyForm = (): PriceEntryInput => ({
  productId: '',
  retailerId: '',
  amountChf: 0,
  unitPriceChf: undefined,
  promotionLabel: '',
  source: 'saisie_manuelle',
  collectedAt: new Date().toISOString(),
})

const form = reactive<PriceEntryInput>(createEmptyForm())
const retailers = ref<RetailerRow[]>([])
const products = ref<ProductRow[]>([])
const prices = ref<PriceRow[]>([])
const history = ref<PriceRow[]>([])
const selectedPrice = ref<PriceRow | null>(null)
const selectedOfferId = ref('')
const importPreview = ref<RetailImportPreview | null>(null)
const csvContent = ref(retailCsvTemplate)
const loading = ref(false)
const saving = ref(false)
const previewing = ref(false)
const feedback = ref('')
const errorMessage = ref('')
const csvPanelOpen = ref(false)

const priceQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }
  if (filters.retailerId) query.retailerId = filters.retailerId
  if (filters.quality) query.quality = filters.quality
  return query
})

const offerOptions = computed<OfferOption[]>(() =>
  products.value
    .flatMap((product) =>
      (product.offers ?? []).map((offer) => ({
        ...offer,
        product_id: product.id,
        product_name: product.name,
        product_slug: product.slug,
      })),
    )
    .filter((offer) => offer.active !== false)
    .filter((offer) => !filters.retailerId || offer.retailer_id === filters.retailerId),
)

const selectedOffer = computed(() => offerOptions.value.find((offer) => offer.id === selectedOfferId.value) ?? null)

const offersWithoutPrice = computed(() =>
  offerOptions.value.filter((offer) => offer.latest_price_chf === null || offer.latest_price_chf === undefined),
)

const selectedOfferHistory = computed(() =>
  history.value.filter((entry) => entry.product_id === selectedOfferId.value).slice(0, 6),
)

const stats = computed(() => ({
  prices: prices.value.length,
  offers: offerOptions.value.length,
  missingPrices: offersWithoutPrice.value.length,
  staleOrAnomaly: prices.value.filter((price) => price.quality_status === 'stale' || price.quality_status === 'anomaly').length,
}))

const qualityLabel: Record<string, string> = {
  fresh: 'Frais',
  stale: 'Périmé',
  anomaly: 'Anomalie',
}

function qualityTone(value: unknown): 'success' | 'warning' | 'danger' | 'neutral' {
  if (value === 'fresh') return 'success'
  if (value === 'stale') return 'warning'
  if (value === 'anomaly') return 'danger'
  return 'neutral'
}

function formatPrice(value: unknown): string {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(numberValue)
    : '—'
}

function formatDate(value: string | null | undefined): string {
  return value
    ? new Date(value).toLocaleString('fr-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Jamais'
}

const unitPricePreview = computed(() => {
  const amount = Number(form.amountChf)
  const quantity = Number(selectedOffer.value?.quantity)

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  return Number((amount / quantity).toFixed(2))
})

function selectOffer(offer: OfferOption): void {
  selectedOfferId.value = offer.id
  selectedPrice.value = prices.value.find((price) => price.product_id === offer.id) ?? null
  form.productId = offer.id
  form.retailerId = offer.retailer_id
  form.unitPriceChf = unitPricePreview.value ?? undefined
  void router.replace({
    query: {
      ...route.query,
      retailerId: filters.retailerId || undefined,
      productOfferId: offer.id,
    },
  })
}

function selectPrice(price: PriceRow): void {
  selectedPrice.value = price
  selectedOfferId.value = price.product_id
  form.productId = price.product_id
  form.retailerId = price.retailer_id
  void router.replace({
    query: {
      ...route.query,
      retailerId: filters.retailerId || undefined,
      productOfferId: price.product_id,
    },
  })
}

function syncFormWithOffer(): void {
  if (!selectedOffer.value) return
  form.productId = selectedOffer.value.id
  form.retailerId = selectedOffer.value.retailer_id
  if (!form.unitPriceChf && unitPricePreview.value) {
    form.unitPriceChf = unitPricePreview.value
  }
}

function resetForm(): void {
  Object.assign(form, createEmptyForm())
  if (selectedOffer.value) {
    form.productId = selectedOffer.value.id
    form.retailerId = selectedOffer.value.retailer_id
  }
}

async function loadRetailers(): Promise<void> {
  const response = await $fetch<{ data: RetailerRow[] }>('/api/admin/retailers', { query: { limit: 100 } })
  retailers.value = response.data
}

async function loadProducts(): Promise<void> {
  const response = await $fetch<{ data: ProductRow[] }>('/api/admin/products', { query: { limit: 100 } })
  products.value = response.data

  const requestedOfferId = typeof route.query.productOfferId === 'string'
    ? route.query.productOfferId
    : typeof route.query.selected === 'string'
      ? route.query.selected
      : null

  if (requestedOfferId) {
    const requestedOffer = offerOptions.value.find((offer) => offer.id === requestedOfferId)
    if (requestedOffer) {
      selectOffer(requestedOffer)
      return
    }
  }

  if (selectedOfferId.value) {
    const existingOffer = offerOptions.value.find((offer) => offer.id === selectedOfferId.value)
    if (existingOffer) {
      selectOffer(existingOffer)
      return
    }
  }

  if (offerOptions.value[0]) {
    selectOffer(offerOptions.value[0])
  }
}

async function loadPrices(): Promise<void> {
  loading.value = true
  errorMessage.value = ''

  try {
    const [priceResponse, historyResponse] = await Promise.all([
      $fetch<{ data: PriceRow[] }>('/api/admin/prices', { query: priceQuery.value }),
      $fetch<{ data: PriceRow[] }>('/api/admin/prices/history', { query: priceQuery.value }),
    ])

    prices.value = priceResponse.data
    history.value = historyResponse.data

    if (selectedOfferId.value) {
      selectedPrice.value = prices.value.find((price) => price.product_id === selectedOfferId.value) ?? null
    }

    if (!selectedPrice.value && prices.value[0]) {
      selectPrice(prices.value[0])
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

async function refreshAll(): Promise<void> {
  await Promise.all([loadRetailers(), loadProducts()])
  await loadPrices()
}

async function savePrice(): Promise<void> {
  saving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    syncFormWithOffer()

    if (!form.unitPriceChf && unitPricePreview.value) {
      form.unitPriceChf = unitPricePreview.value
    }

    const response = await $fetch<{ data: PriceRow }>('/api/admin/prices', { method: 'POST', body: form })

    feedback.value = 'Prix enregistré et historisé.'
    selectedPrice.value = response.data
    resetForm()
    await refreshAll()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

async function previewCsvImport(): Promise<void> {
  previewing.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: RetailImportPreview; reportId: string }>('/api/admin/retail-import/preview', {
      method: 'POST',
      body: {
        fileName: 'comparateur.csv',
        content: csvContent.value,
      },
    })

    importPreview.value = response.data
    feedback.value = `Prévisualisation CSV enregistrée (${response.reportId}).`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Prévisualisation impossible.'
  } finally {
    previewing.value = false
  }
}

async function applyFilters(): Promise<void> {
  void router.replace({
    query: {
      retailerId: filters.retailerId || undefined,
      quality: filters.quality || undefined,
      productOfferId: selectedOfferId.value || undefined,
    },
  })
  await refreshAll()
}

async function clearFilters(): Promise<void> {
  filters.retailerId = ''
  filters.quality = ''
  void router.replace({
    query: {
      productOfferId: selectedOfferId.value || undefined,
    },
  })
  await refreshAll()
}

watch(() => selectedOfferId.value, syncFormWithOffer)
watch(() => form.amountChf, () => {
  if (unitPricePreview.value) {
    form.unitPriceChf = unitPricePreview.value
  }
})

onMounted(refreshAll)
</script>

<template>
  <section class="admin-page">
    <AdminPageHeader
      eyebrow="COUR-102 · prix"
      title="Prix magasin"
      description="Maintiens les prix réels utilisés par le comparateur mobile. Chaque saisie ajoute une ligne d’historique."
    >
      <template #actions>
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="refreshAll">
          {{ loading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
        <NuxtLink
          class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md bg-coursia-primary px-4 py-2.5 text-sm font-semibold text-coursia-primary-contrast transition hover:opacity-90"
          to="/admin/produits"
        >
          Créer une offre
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Prix récents</p>
        <p class="admin-stat-value">{{ stats.prices }}</p>
        <p class="admin-stat-caption">lignes affichées</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Offres actives</p>
        <p class="admin-stat-value">{{ stats.offers }}</p>
        <p class="admin-stat-caption">filtre courant</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Sans prix</p>
        <p class="admin-stat-value">{{ stats.missingPrices }}</p>
        <p class="admin-stat-caption">à compléter</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">À contrôler</p>
        <p class="admin-stat-value">{{ stats.staleOrAnomaly }}</p>
        <p class="admin-stat-caption">périmés/anomalies</p>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1fr_0.75fr_auto]" @submit.prevent="applyFilters">
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
        Enseigne
        <select v-model="filters.retailerId">
          <option value="">Toutes les enseignes</option>
          <option v-for="retailer in retailers" :key="retailer.id" :value="retailer.id">
            {{ retailer.name }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
        Qualité
        <select v-model="filters.quality">
          <option value="">Tous les états</option>
          <option value="fresh">Frais</option>
          <option value="stale">Périmé</option>
          <option value="anomaly">Anomalie</option>
        </select>
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton v-if="filters.retailerId || filters.quality" type="button" variant="ghost" @click="clearFilters">
          Effacer
        </BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <section class="overflow-hidden rounded-3xl border border-[#e6e1d8] bg-coursia-surface dark:border-white/10 dark:bg-[#111827]">
        <div class="flex items-center justify-between gap-4 border-b border-[#ece6dc] px-5 py-4 dark:border-white/10">
          <div>
            <h2 class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Offres magasin</h2>
            <p class="mt-1 text-xs text-[#667085] dark:text-[#a8b8ad]">Sélectionne une offre pour saisir son prix.</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : `${offerOptions.length} offres` }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-5 text-sm text-[#667085] dark:text-[#a8b8ad]">
          Chargement des offres...
        </div>

        <AdminEmptyState
          v-else-if="offerOptions.length === 0"
          icon="products"
          title="Aucune offre disponible"
          description="Crée d’abord une offre magasin depuis la page Produits."
        >
          <template #actions>
            <NuxtLink
              class="inline-flex cursor-pointer rounded-coursia-md border border-[#e6e1d8] bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-[#344054] transition hover:bg-[#f7f4ed] dark:border-white/10 dark:bg-white/5 dark:text-[#dbe7df] dark:hover:bg-white/10"
              to="/admin/produits"
            >
              Aller aux produits
            </NuxtLink>
          </template>
        </AdminEmptyState>

        <div v-else class="grid gap-2 p-4">
          <button
            v-for="offer in offerOptions"
            :key="offer.id"
            type="button"
            class="cursor-pointer rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-coursia-primary/35 dark:hover:bg-white/10"
            :class="selectedOfferId === offer.id ? 'border-coursia-primary bg-[#eef7f1] dark:bg-coursia-primary/15' : 'border-[#e6e1d8] bg-[#fbf8f1] dark:border-white/10 dark:bg-white/5'"
            @click="selectOffer(offer)"
          >
            <span class="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_12rem_9rem] md:items-center">
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ offer.product_name }}</span>
                <span class="mt-1 block truncate text-xs text-[#667085] dark:text-[#a8b8ad]">
                  {{ offer.retailer_name }} · {{ offer.format }} · {{ offer.quantity }} {{ offer.unit }}
                </span>
              </span>
              <span class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ formatPrice(offer.latest_price_chf) }}</span>
              <span class="text-xs text-[#667085] dark:text-[#a8b8ad]">{{ formatDate(offer.latest_price_collected_at) }}</span>
            </span>
          </button>
        </div>
      </section>

      <aside class="grid gap-4">
        <section class="rounded-3xl border border-[#e6e1d8] bg-coursia-surface p-5 dark:border-white/10 dark:bg-[#111827]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">Saisie rapide</p>
              <h2 class="mt-2 text-lg font-semibold text-[#101828] dark:text-[#f7fbf8]">Nouveau prix</h2>
            </div>
            <BaseBadge :tone="selectedOffer ? 'primary' : 'warning'">
              {{ selectedOffer ? 'Offre choisie' : 'À choisir' }}
            </BaseBadge>
          </div>

          <div v-if="selectedOffer" class="mt-4 rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-3 dark:border-white/10 dark:bg-white/5">
            <p class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ selectedOffer.product_name }}</p>
            <p class="mt-1 text-xs leading-5 text-[#667085] dark:text-[#a8b8ad]">
              {{ selectedOffer.retailer_name }} · {{ selectedOffer.format }} · dernier prix : {{ formatPrice(selectedOffer.latest_price_chf) }}
            </p>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="savePrice">
            <div class="grid grid-cols-2 gap-2">
              <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                Prix CHF
                <input v-model.number="form.amountChf" required type="number" min="0.01" step="0.01" placeholder="2.40">
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                Prix unitaire
                <input v-model.number="form.unitPriceChf" type="number" min="0.01" step="0.01" placeholder="Auto">
              </label>
            </div>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
              Promotion
              <input v-model="form.promotionLabel" placeholder="Action 20%, 2 pour 1...">
            </label>
            <div class="grid grid-cols-[1fr_1.1fr] gap-2">
              <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                Source
                <input v-model="form.source" required placeholder="coop.ch, saisie_admin...">
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-[#dbe7df]">
                Collecte
                <input v-model="form.collectedAt" required>
              </label>
            </div>

            <div class="rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-3 text-xs leading-5 text-[#667085] dark:border-white/10 dark:bg-white/5 dark:text-[#a8b8ad]">
              Le prix est ajouté à l’historique. L’application mobile utilisera ensuite le prix le plus récent de l’offre.
            </div>

            <BaseButton type="submit" :disabled="saving || !selectedOffer">
              {{ saving ? 'Enregistrement...' : 'Enregistrer le prix' }}
            </BaseButton>
          </form>
        </section>

        <section class="rounded-3xl border border-[#e6e1d8] bg-coursia-surface p-5 dark:border-white/10 dark:bg-[#111827]">
          <h2 class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Historique de l’offre</h2>
          <div v-if="selectedOfferHistory.length === 0" class="mt-4 rounded-2xl bg-[#fbf8f1] p-4 text-sm text-[#667085] dark:bg-white/5 dark:text-[#a8b8ad]">
            Aucun historique pour cette offre.
          </div>
          <div v-else class="mt-4 grid gap-2">
            <button
              v-for="entry in selectedOfferHistory"
              :key="entry.id"
              type="button"
              class="cursor-pointer rounded-2xl border border-[#e6e1d8] bg-[#fbf8f1] p-3 text-left transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              @click="selectPrice(entry)"
            >
              <span class="flex items-center justify-between gap-3">
                <span>
                  <span class="block text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ formatPrice(entry.amount_chf) }}</span>
                  <span class="mt-1 block text-xs text-[#667085] dark:text-[#a8b8ad]">{{ entry.promotion_label || entry.source || 'Saisie' }}</span>
                </span>
                <span class="text-right text-xs text-[#667085] dark:text-[#a8b8ad]">{{ formatDate(entry.collected_at) }}</span>
              </span>
            </button>
          </div>
        </section>
      </aside>
    </div>

    <section class="overflow-hidden rounded-3xl border border-[#e6e1d8] bg-coursia-surface dark:border-white/10 dark:bg-[#111827]">
      <div class="flex flex-col justify-between gap-3 border-b border-[#ece6dc] px-5 py-4 dark:border-white/10 md:flex-row md:items-center">
        <div>
          <h2 class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Prix récents</h2>
          <p class="mt-1 text-xs text-[#667085] dark:text-[#a8b8ad]">{{ prices.length }} ligne(s) affichée(s)</p>
        </div>
        <BaseButton type="button" variant="secondary" @click="csvPanelOpen = !csvPanelOpen">
          {{ csvPanelOpen ? 'Masquer CSV' : 'Prévisualiser CSV' }}
        </BaseButton>
      </div>

      <div class="grid gap-2 p-4">
        <button
          v-for="price in prices"
          :key="price.id"
          type="button"
          class="cursor-pointer rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-coursia-primary/35 dark:hover:bg-white/10"
          :class="selectedPrice?.id === price.id ? 'border-coursia-primary bg-[#eef7f1] dark:bg-coursia-primary/15' : 'border-[#e6e1d8] bg-[#fbf8f1] dark:border-white/10 dark:bg-white/5'"
          @click="selectPrice(price)"
        >
          <span class="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_10rem_8rem_9rem] md:items-center">
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ price.product_name }}</span>
              <span class="mt-1 block truncate text-xs text-[#667085] dark:text-[#a8b8ad]">{{ price.retailer_name }} · {{ price.offer?.format || price.product_id }}</span>
            </span>
            <span class="font-semibold text-[#101828] dark:text-[#f7fbf8]">{{ formatPrice(price.amount_chf) }}</span>
            <BaseBadge :tone="qualityTone(price.quality_status)">
              {{ qualityLabel[String(price.quality_status)] ?? 'Non qualifié' }}
            </BaseBadge>
            <span class="text-xs text-[#667085] dark:text-[#a8b8ad]">{{ formatDate(price.collected_at) }}</span>
          </span>
        </button>

        <div v-if="!loading && prices.length === 0" class="rounded-2xl bg-[#fbf8f1] p-6 text-center text-sm text-[#667085] dark:bg-white/5 dark:text-[#a8b8ad]">
          Aucun prix pour le moment.
        </div>
      </div>
    </section>

    <section v-if="csvPanelOpen" class="rounded-3xl border border-[#e6e1d8] bg-coursia-surface p-5 dark:border-white/10 dark:bg-[#111827]">
      <div class="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 class="text-sm font-semibold text-[#101828] dark:text-[#f7fbf8]">Prévisualisation CSV</h2>
          <p class="mt-2 text-xs leading-5 text-[#667085] dark:text-[#a8b8ad]">
            Colonnes attendues : {{ retailCsvColumns.join(', ') }}.
          </p>
        </div>
        <BaseButton type="button" variant="secondary" :disabled="previewing" @click="previewCsvImport">
          {{ previewing ? 'Analyse...' : 'Prévisualiser' }}
        </BaseButton>
      </div>
      <textarea v-model="csvContent" aria-label="Contenu CSV prix" rows="8" class="mt-4 font-mono text-sm" />
      <div v-if="importPreview" class="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">Créations : <strong>{{ importPreview.creates }}</strong></div>
        <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">Mises à jour : <strong>{{ importPreview.updates }}</strong></div>
        <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">Erreurs : <strong>{{ importPreview.errors }}</strong></div>
        <div class="rounded-xl bg-[#fbf8f1] p-3 dark:bg-white/5">Anomalies : <strong>{{ importPreview.anomalies }}</strong></div>
      </div>
    </section>
  </section>
</template>
