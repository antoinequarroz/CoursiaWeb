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

const form = reactive<PriceEntryInput>({
  productId: '',
  retailerId: '',
  amountChf: 0,
  unitPriceChf: undefined,
  promotionLabel: '',
  source: 'saisie_manuelle',
  collectedAt: new Date().toISOString(),
})

const retailers = ref<RetailerRow[]>([])
const products = ref<ProductRow[]>([])
const prices = ref<PriceRow[]>([])
const history = ref<PriceRow[]>([])
const selectedPrice = ref<PriceRow | null>(null)
const importPreview = ref<RetailImportPreview | null>(null)
const csvContent = ref(retailCsvTemplate)
const loading = ref(false)
const saving = ref(false)
const previewing = ref(false)
const feedback = ref('')
const errorMessage = ref('')

const priceQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }
  if (filters.retailerId) query.retailerId = filters.retailerId
  if (filters.quality) query.quality = filters.quality
  return query
})

const offerOptions = computed<OfferOption[]>(() =>
  products.value.flatMap((product) =>
    (product.offers ?? []).map((offer) => ({
      ...offer,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
    })),
  ).filter((offer) => !filters.retailerId || offer.retailer_id === filters.retailerId),
)

const selectedOffer = computed(() => offerOptions.value.find((offer) => offer.id === form.productId) ?? null)

const stats = computed(() => ({
  prices: prices.value.length,
  offers: offerOptions.value.length,
  promoted: prices.value.filter((price) => Boolean(price.promotion_label)).length,
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

const syncFormWithOffer = () => {
  if (!selectedOffer.value) return
  form.retailerId = selectedOffer.value.retailer_id
  if (!form.unitPriceChf && Number(form.amountChf) > 0 && selectedOffer.value.quantity > 0) {
    form.unitPriceChf = Number((Number(form.amountChf) / selectedOffer.value.quantity).toFixed(2))
  }
}

const loadRetailers = async () => {
  const response = await $fetch<{ data: RetailerRow[] }>('/api/admin/retailers', { query: { limit: 100 } })
  retailers.value = response.data
}

const loadProducts = async () => {
  const response = await $fetch<{ data: ProductRow[] }>('/api/admin/products', { query: { limit: 100 } })
  products.value = response.data
  if (!form.productId && offerOptions.value[0]) {
    form.productId = offerOptions.value[0].id
    form.retailerId = offerOptions.value[0].retailer_id
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

    if (selectedPrice.value) {
      selectedPrice.value = prices.value.find((price) => price.id === selectedPrice.value?.id) ?? null
    }

    if (!selectedPrice.value && prices.value[0]) {
      selectedPrice.value = prices.value[0]
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

const selectPrice = (price: PriceRow) => {
  selectedPrice.value = price
}

const savePrice = async () => {
  saving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    syncFormWithOffer()
    const response = await $fetch<{ data: PriceRow }>('/api/admin/prices', { method: 'POST', body: form })

    feedback.value = 'Prix enregistré et historisé.'
    selectedPrice.value = response.data
    await loadPrices()
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
  await loadPrices()
}

watch(() => form.productId, syncFormWithOffer)

onMounted(async () => {
  await Promise.all([loadRetailers(), loadProducts()])
  await loadPrices()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">Comparateur</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
          Prix et historique
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Saisie contrôlée des prix par offre magasin. Ces valeurs alimentent le comparateur et les économies affichées.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadPrices">
          Rafraîchir
        </BaseButton>
        <NuxtLink class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md bg-coursia-primary px-4 py-2.5 text-sm font-semibold text-coursia-primary-contrast shadow-coursia-sm transition hover:opacity-90" to="/admin/produits">
          Gérer les offres
        </NuxtLink>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article class="admin-stat-card">
        <span>Prix</span>
        <strong>{{ stats.prices }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Offres filtrées</span>
        <strong class="text-coursia-primary">{{ stats.offers }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Promotions</span>
        <strong>{{ stats.promoted }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>À contrôler</span>
        <strong class="text-coursia-warning">{{ stats.staleOrAnomaly }}</strong>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1fr_0.75fr_auto]" @submit.prevent="loadPrices">
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
          <option value="">Tous états</option>
          <option value="fresh">Frais</option>
          <option value="stale">Périmé</option>
          <option value="anomaly">Anomalie</option>
        </select>
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton v-if="filters.retailerId || filters.quality" type="button" variant="ghost" @click="clearFilters">Effacer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex items-center justify-between gap-4 border-b border-coursia-border px-4 py-3">
          <div>
            <h2 class="text-base font-black text-coursia-foreground">Prix récents</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ prices.length }} prix affiché(s)</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Live Supabase' }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-4 text-sm text-coursia-muted">
          Chargement des prix...
        </div>

        <div v-else-if="prices.length === 0" class="grid place-items-center p-10 text-center">
          <div class="max-w-sm">
            <p class="font-black text-coursia-foreground">Aucun prix enregistré</p>
            <p class="mt-2 text-sm text-coursia-muted">
              Crée d’abord une offre magasin dans Produits, puis ajoute son premier prix ici.
            </p>
            <NuxtLink class="mt-4 inline-flex cursor-pointer rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-foreground transition hover:bg-coursia-surface-muted" to="/admin/produits">
              Aller aux produits
            </NuxtLink>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
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
            </tbody>
          </table>
        </div>
      </section>

      <aside class="grid gap-4">
        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Saisie</p>
              <h2 class="mt-1 text-lg font-black text-coursia-foreground">Nouveau prix</h2>
            </div>
            <BaseBadge :tone="offerOptions.length ? 'primary' : 'warning'">
              {{ offerOptions.length }} offre(s)
            </BaseBadge>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="savePrice">
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Offre magasin
              <select v-model="form.productId" required>
                <option value="" disabled>Choisir une offre</option>
                <option v-for="offer in offerOptions" :key="offer.id" :value="offer.id">
                  {{ offer.product_name }} · {{ offer.retailer_name }} · {{ offer.format }}
                </option>
              </select>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Prix CHF
                <input v-model.number="form.amountChf" required type="number" min="0.01" step="0.01" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Prix unitaire
                <input v-model.number="form.unitPriceChf" type="number" min="0.01" step="0.01" />
              </label>
            </div>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Promotion
              <input v-model="form.promotionLabel" placeholder="Action 20%, 2 pour 1..." />
            </label>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Source
              <input v-model="form.source" required placeholder="saisie_manuelle, coop.ch..." />
            </label>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Date de collecte
              <input v-model="form.collectedAt" required />
            </label>

            <div v-if="selectedOffer" class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-black text-coursia-foreground">{{ selectedOffer.product_name }}</p>
              <p class="mt-1 text-xs text-coursia-muted">
                {{ selectedOffer.retailer_name }} · {{ selectedOffer.quantity }} {{ selectedOffer.unit }} · dernier prix :
                {{ formatPrice(selectedOffer.latest_price_chf) }}
              </p>
            </div>

            <BaseButton type="submit" :disabled="saving || !form.productId">
              {{ saving ? 'Enregistrement...' : 'Enregistrer le prix' }}
            </BaseButton>
          </form>
        </section>

        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-black text-coursia-foreground">Détail sélectionné</h2>
          <div v-if="!selectedPrice" class="mt-4 rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
            Aucun prix sélectionné.
          </div>
          <dl v-else class="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Produit</dt>
              <dd class="mt-1 font-black text-coursia-foreground">{{ selectedPrice.product_name }}</dd>
            </div>
            <div class="rounded-xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Enseigne</dt>
              <dd class="mt-1 font-black text-coursia-foreground">{{ selectedPrice.retailer_name }}</dd>
            </div>
            <div class="rounded-xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Prix</dt>
              <dd class="mt-1 font-black text-coursia-foreground">{{ formatPrice(selectedPrice.amount_chf) }}</dd>
            </div>
            <div class="rounded-xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Collecte</dt>
              <dd class="mt-1 font-black text-coursia-foreground">{{ formatDate(selectedPrice.collected_at) }}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex items-center justify-between gap-4 border-b border-coursia-border px-4 py-3">
          <div>
            <h2 class="text-base font-black text-coursia-foreground">Historique</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ history.length }} ligne(s) d’historique</p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-[48rem]">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Enseigne</th>
                <th>Prix</th>
                <th>Promotion</th>
                <th>Collecte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in history" :key="entry.id">
                <td class="font-semibold text-coursia-foreground">{{ entry.product_name }}</td>
                <td class="text-sm text-coursia-muted">{{ entry.retailer_name }}</td>
                <td class="font-black text-coursia-foreground">{{ formatPrice(entry.amount_chf) }}</td>
                <td class="text-sm text-coursia-muted">{{ entry.promotion_label || '—' }}</td>
                <td class="text-sm text-coursia-muted">{{ formatDate(entry.collected_at) }}</td>
              </tr>
              <tr v-if="history.length === 0">
                <td colspan="5" class="p-6 text-center text-sm text-coursia-muted">
                  Aucun historique pour le moment.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
        <h2 class="text-base font-black text-coursia-foreground">Prévisualisation CSV</h2>
        <p class="mt-2 text-xs leading-5 text-coursia-muted">
          Colonnes attendues : {{ retailCsvColumns.join(', ') }}.
        </p>
        <textarea v-model="csvContent" aria-label="Contenu CSV prix" rows="9" class="mt-4 font-mono text-sm" />
        <BaseButton class="mt-4" type="button" variant="secondary" :disabled="previewing" @click="previewCsvImport">
          {{ previewing ? 'Analyse...' : 'Prévisualiser' }}
        </BaseButton>
        <div v-if="importPreview" class="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div class="rounded-xl bg-coursia-surface-muted p-3">Créations : <strong>{{ importPreview.creates }}</strong></div>
          <div class="rounded-xl bg-coursia-surface-muted p-3">Mises à jour : <strong>{{ importPreview.updates }}</strong></div>
          <div class="rounded-xl bg-coursia-surface-muted p-3">Erreurs : <strong>{{ importPreview.errors }}</strong></div>
          <div class="rounded-xl bg-coursia-surface-muted p-3">Anomalies : <strong>{{ importPreview.anomalies }}</strong></div>
        </div>
      </section>
    </div>
  </section>
</template>
