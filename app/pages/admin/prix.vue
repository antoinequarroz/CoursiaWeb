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

const filters = reactive({
  retailerId: typeof route.query.retailerId === 'string' ? route.query.retailerId : '',
  quality: '',
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

const qualityTone = (value: unknown): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (value === 'fresh') return 'success'
  if (value === 'stale') return 'warning'
  if (value === 'anomaly') return 'danger'
  return 'neutral'
}

const formatPrice = (value: unknown) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(numberValue)
    : '—'
}

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('fr-CH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Jamais'

const unitPricePreview = computed(() => {
  const amount = Number(form.amountChf)
  const quantity = Number(selectedOffer.value?.quantity)

  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
    return null
  }

  return Number((amount / quantity).toFixed(2))
})

const selectOffer = (offer: OfferOption) => {
  selectedOfferId.value = offer.id
  selectedPrice.value = prices.value.find((price) => price.product_id === offer.id) ?? null
  form.productId = offer.id
  form.retailerId = offer.retailer_id
  form.unitPriceChf = unitPricePreview.value ?? undefined
}

const selectPrice = (price: PriceRow) => {
  selectedPrice.value = price
  selectedOfferId.value = price.product_id
  form.productId = price.product_id
  form.retailerId = price.retailer_id
}

const syncFormWithOffer = () => {
  if (!selectedOffer.value) return
  form.productId = selectedOffer.value.id
  form.retailerId = selectedOffer.value.retailer_id
  if (!form.unitPriceChf && unitPricePreview.value) {
    form.unitPriceChf = unitPricePreview.value
  }
}

const resetForm = () => {
  Object.assign(form, createEmptyForm())
  if (selectedOffer.value) {
    form.productId = selectedOffer.value.id
    form.retailerId = selectedOffer.value.retailer_id
  }
}

const loadRetailers = async () => {
  const response = await $fetch<{ data: RetailerRow[] }>('/api/admin/retailers', { query: { limit: 100 } })
  retailers.value = response.data
}

const loadProducts = async () => {
  const response = await $fetch<{ data: ProductRow[] }>('/api/admin/products', { query: { limit: 100 } })
  products.value = response.data

  if (!selectedOfferId.value && offerOptions.value[0]) {
    selectOffer(offerOptions.value[0])
  }
}

const loadPrices = async () => {
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

const refreshAll = async () => {
  await Promise.all([loadRetailers(), loadProducts()])
  await loadPrices()
}

const savePrice = async () => {
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

const previewCsvImport = async () => {
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

const clearFilters = async () => {
  filters.retailerId = ''
  filters.quality = ''
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
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">Comparateur</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
          Prix magasin
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Maintiens les prix réels utilisés par le comparateur mobile. Chaque saisie ajoute une ligne d’historique.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="refreshAll">
          Rafraîchir
        </BaseButton>
        <NuxtLink
          class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md bg-coursia-primary px-4 py-2.5 text-sm font-semibold text-coursia-primary-contrast shadow-coursia-sm transition hover:opacity-90"
          to="/admin/produits"
        >
          Créer une offre
        </NuxtLink>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article class="admin-stat-card">
        <span>Prix récents</span>
        <strong>{{ stats.prices }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Offres actives</span>
        <strong class="text-coursia-primary">{{ stats.offers }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Sans prix</span>
        <strong class="text-coursia-warning">{{ stats.missingPrices }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>À contrôler</span>
        <strong class="text-coursia-danger">{{ stats.staleOrAnomaly }}</strong>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1fr_0.75fr_auto]" @submit.prevent="refreshAll">
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
        Enseigne
        <select v-model="filters.retailerId">
          <option value="">Toutes les enseignes</option>
          <option v-for="retailer in retailers" :key="retailer.id" :value="retailer.id">
            {{ retailer.name }}
          </option>
        </select>
      </label>
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
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

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-black text-coursia-foreground">Offres magasin</h2>
            <p class="mt-1 text-xs text-coursia-muted">
              Sélectionne une offre pour saisir son nouveau prix.
            </p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : `${offerOptions.length} offres` }}</BaseBadge>
        </div>

        <div v-if="loading" class="mt-4 rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
          Chargement des offres...
        </div>

        <div v-else-if="offerOptions.length === 0" class="mt-4 grid place-items-center rounded-2xl bg-coursia-surface-muted p-10 text-center">
          <div class="max-w-sm">
            <p class="font-black text-coursia-foreground">Aucune offre disponible</p>
            <p class="mt-2 text-sm text-coursia-muted">
              Crée d’abord une offre magasin depuis la page Produits.
            </p>
            <NuxtLink
              class="mt-4 inline-flex cursor-pointer rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-foreground transition hover:bg-coursia-surface-muted"
              to="/admin/produits"
            >
              Aller aux produits
            </NuxtLink>
          </div>
        </div>

        <div v-else class="mt-4 grid gap-2">
          <button
            v-for="offer in offerOptions"
            :key="offer.id"
            type="button"
            class="cursor-pointer rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-coursia-sm"
            :class="selectedOfferId === offer.id ? 'border-coursia-primary bg-coursia-primary/10' : 'border-coursia-border bg-coursia-surface-muted'"
            @click="selectOffer(offer)"
          >
            <span class="flex items-start justify-between gap-3">
              <span class="min-w-0">
                <span class="block truncate text-sm font-black text-coursia-foreground">{{ offer.product_name }}</span>
                <span class="mt-1 block truncate text-xs text-coursia-muted">
                  {{ offer.retailer_name }} · {{ offer.format }} · {{ offer.quantity }} {{ offer.unit }}
                </span>
              </span>
              <span class="text-right">
                <span class="block text-sm font-black text-coursia-foreground">{{ formatPrice(offer.latest_price_chf) }}</span>
                <span class="mt-1 block text-[0.68rem] font-bold uppercase tracking-[0.12em] text-coursia-muted">
                  {{ formatDate(offer.latest_price_collected_at) }}
                </span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <aside class="grid gap-4">
        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Saisie rapide</p>
              <h2 class="mt-1 text-lg font-black text-coursia-foreground">Nouveau prix</h2>
            </div>
            <BaseBadge :tone="selectedOffer ? 'primary' : 'warning'">
              {{ selectedOffer ? 'Offre choisie' : 'À choisir' }}
            </BaseBadge>
          </div>

          <div v-if="selectedOffer" class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
            <p class="text-sm font-black text-coursia-foreground">{{ selectedOffer.product_name }}</p>
            <p class="mt-1 text-xs leading-5 text-coursia-muted">
              {{ selectedOffer.retailer_name }} · {{ selectedOffer.format }} · dernier prix :
              {{ formatPrice(selectedOffer.latest_price_chf) }}
            </p>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="savePrice">
            <div class="grid grid-cols-2 gap-2">
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Prix CHF
                <input v-model.number="form.amountChf" required type="number" min="0.01" step="0.01" placeholder="2.40" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Prix unitaire
                <input v-model.number="form.unitPriceChf" type="number" min="0.01" step="0.01" placeholder="Auto" />
              </label>
            </div>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Promotion
              <input v-model="form.promotionLabel" placeholder="Action 20%, 2 pour 1..." />
            </label>
            <div class="grid grid-cols-[1fr_1.1fr] gap-2">
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Source
                <input v-model="form.source" required placeholder="coop.ch, saisie_admin..." />
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Collecte
                <input v-model="form.collectedAt" required />
              </label>
            </div>

            <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3 text-xs leading-5 text-coursia-muted">
              Ce prix est ajouté à l’historique. L’application mobile utilisera ensuite le prix le plus récent de l’offre.
            </div>

            <BaseButton type="submit" :disabled="saving || !selectedOffer">
              {{ saving ? 'Enregistrement...' : 'Enregistrer le prix' }}
            </BaseButton>
          </form>
        </section>

        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-black text-coursia-foreground">Historique de l’offre</h2>
          <div v-if="selectedOfferHistory.length === 0" class="mt-4 rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
            Aucun historique pour cette offre.
          </div>
          <div v-else class="mt-4 grid gap-2">
            <button
              v-for="entry in selectedOfferHistory"
              :key="entry.id"
              type="button"
              class="cursor-pointer rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3 text-left transition hover:bg-coursia-surface"
              @click="selectPrice(entry)"
            >
              <span class="flex items-center justify-between gap-3">
                <span>
                  <span class="block text-sm font-black text-coursia-foreground">{{ formatPrice(entry.amount_chf) }}</span>
                  <span class="mt-1 block text-xs text-coursia-muted">{{ entry.promotion_label || entry.source || 'Saisie' }}</span>
                </span>
                <span class="text-right text-xs text-coursia-muted">{{ formatDate(entry.collected_at) }}</span>
              </span>
            </button>
          </div>
        </section>
      </aside>
    </div>

    <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
      <div class="flex flex-col justify-between gap-3 border-b border-coursia-border px-4 py-3 md:flex-row md:items-center">
        <div>
          <h2 class="text-base font-black text-coursia-foreground">Prix récents</h2>
          <p class="mt-1 text-xs text-coursia-muted">{{ prices.length }} ligne(s) affichée(s)</p>
        </div>
        <BaseButton type="button" variant="secondary" @click="csvPanelOpen = !csvPanelOpen">
          {{ csvPanelOpen ? 'Masquer CSV' : 'Prévisualiser CSV' }}
        </BaseButton>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[58rem]">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Enseigne</th>
              <th>Prix</th>
              <th>Qualité</th>
              <th>Collecte</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="price in prices"
              :key="price.id"
              class="cursor-pointer transition"
              :class="selectedPrice?.id === price.id ? 'bg-coursia-primary/10 shadow-[inset_4px_0_0_var(--color-coursia-primary)]' : ''"
              @click="selectPrice(price)"
            >
              <td>
                <span class="block max-w-[18rem] truncate font-black text-coursia-foreground">{{ price.product_name }}</span>
                <span class="mt-1 block max-w-[18rem] truncate text-xs text-coursia-muted">
                  {{ price.offer?.format || price.product_id }}
                </span>
              </td>
              <td class="text-sm text-coursia-muted">{{ price.retailer_name }}</td>
              <td class="font-black text-coursia-foreground">{{ formatPrice(price.amount_chf) }}</td>
              <td>
                <BaseBadge :tone="qualityTone(price.quality_status)">
                  {{ qualityLabel[String(price.quality_status)] ?? 'Non qualifié' }}
                </BaseBadge>
              </td>
              <td class="text-sm text-coursia-muted">{{ formatDate(price.collected_at) }}</td>
              <td class="text-sm text-coursia-muted">{{ price.source }}</td>
            </tr>
            <tr v-if="!loading && prices.length === 0">
              <td colspan="6" class="p-6 text-center text-sm text-coursia-muted">
                Aucun prix pour le moment.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="csvPanelOpen" class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
      <div class="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h2 class="text-base font-black text-coursia-foreground">Prévisualisation CSV</h2>
          <p class="mt-2 text-xs leading-5 text-coursia-muted">
            Colonnes attendues : {{ retailCsvColumns.join(', ') }}.
          </p>
        </div>
        <BaseButton type="button" variant="secondary" :disabled="previewing" @click="previewCsvImport">
          {{ previewing ? 'Analyse...' : 'Prévisualiser' }}
        </BaseButton>
      </div>
      <textarea v-model="csvContent" aria-label="Contenu CSV prix" rows="8" class="mt-4 font-mono text-sm" />
      <div v-if="importPreview" class="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
        <div class="rounded-xl bg-coursia-surface-muted p-3">Créations : <strong>{{ importPreview.creates }}</strong></div>
        <div class="rounded-xl bg-coursia-surface-muted p-3">Mises à jour : <strong>{{ importPreview.updates }}</strong></div>
        <div class="rounded-xl bg-coursia-surface-muted p-3">Erreurs : <strong>{{ importPreview.errors }}</strong></div>
        <div class="rounded-xl bg-coursia-surface-muted p-3">Anomalies : <strong>{{ importPreview.anomalies }}</strong></div>
      </div>
    </section>
  </section>
</template>
