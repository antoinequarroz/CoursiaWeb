<script setup lang="ts">
import { webQualityBudgets } from '#shared/quality/performance-budgets'
import { retailCsvColumns, retailCsvTemplate, type PriceEntryInput, type RetailImportPreview } from '#shared/validation/retail-catalog'

definePageMeta({
  layout: 'admin',
})

const form = reactive<PriceEntryInput>({
  productId: '00000000-0000-4000-8000-000000000001',
  retailerId: '00000000-0000-4000-8000-000000000001',
  amountChf: 0,
  unitPriceChf: undefined,
  promotionLabel: '',
  source: '',
  collectedAt: new Date().toISOString(),
})

const filters = reactive({
  retailerId: '',
  quality: '',
})

const prices = ref<Array<Record<string, unknown>>>([])
const history = ref<Array<Record<string, unknown>>>([])
const pricePage = ref(1)
const historyPage = ref(1)
const adminPageSize = webQualityBudgets.adminPages.maxInitialRows
const visiblePrices = computed(() =>
  prices.value.slice((pricePage.value - 1) * adminPageSize, pricePage.value * adminPageSize),
)
const visibleHistory = computed(() =>
  history.value.slice((historyPage.value - 1) * adminPageSize, historyPage.value * adminPageSize),
)
const hasMorePrices = computed(() => prices.value.length > pricePage.value * adminPageSize)
const hasMoreHistory = computed(() => history.value.length > historyPage.value * adminPageSize)
const csvContent = ref(retailCsvTemplate)
const importPreview = ref<RetailImportPreview | null>(null)
const feedback = ref('')
const loading = ref(false)

const loadPrices = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/prices', {
      query: filters,
    })
    prices.value = response.data
    pricePage.value = 1
  } finally {
    loading.value = false
  }
}

const loadHistory = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/prices/history', {
    query: filters,
  })
  history.value = response.data
  historyPage.value = 1
}

const savePrice = async () => {
  await $fetch('/api/admin/prices', { method: 'POST', body: form })
  feedback.value = 'Prix courant enregistré, historique conservé et mutation auditée.'
  await Promise.all([loadPrices(), loadHistory()])
}

const previewCsvImport = async () => {
  const response = await $fetch<{ data: RetailImportPreview; reportId: string }>('/api/admin/retail-import/preview', {
    method: 'POST',
    body: {
      fileName: 'comparateur.csv',
      content: csvContent.value,
    },
  })
  importPreview.value = response.data
  feedback.value = `Prévisualisation CSV conservée (${response.reportId}).`
}

const qualityLabel = (value: unknown) => {
  const status = String(value ?? '')
  if (status === 'fresh') return 'Frais'
  if (status === 'stale') return 'Périmé'
  if (status === 'anomaly') return 'Anomalie'
  return status || 'Non qualifié'
}

onMounted(() => {
  void Promise.all([loadPrices(), loadHistory()])
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-102</p>
        <h1 class="mt-2 text-3xl font-black">Prix et qualité du comparateur</h1>
        <p class="mt-3 text-coursia-muted">
          Prix courants, promotions, sources, dates de collecte, historique et prévisualisation CSV.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="loadHistory">Historique</BaseButton>
        <BaseButton type="button" :disabled="loading" @click="loadPrices">Rafraîchir</BaseButton>
      </div>
    </div>

    <form class="admin-toolbar grid gap-3 md:grid-cols-[1fr_16rem_auto]" @submit.prevent="loadPrices">
      <label class="grid gap-1 text-sm font-bold">
        Enseigne
        <input v-model="filters.retailerId" aria-label="Filtrer les prix par ID enseigne" placeholder="ID enseigne" />
      </label>
      <label class="grid gap-1 text-sm font-bold">
        Qualité
        <select v-model="filters.quality" aria-label="Filtrer les prix par qualité">
          <option value="">Tous états</option>
          <option value="fresh">Frais</option>
          <option value="stale">Périmé</option>
          <option value="anomaly">Variation anormale</option>
        </select>
      </label>
      <div class="flex items-end">
        <BaseButton type="submit" class="w-full" :disabled="loading">Filtrer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-xl border border-coursia-border bg-coursia-surface px-4 py-3 text-sm font-semibold">
      {{ feedback }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <section class="rounded-xl border border-coursia-border bg-coursia-surface p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-black">Prix courants</h2>
          <span class="text-sm text-coursia-muted">{{ visiblePrices.length }} / {{ prices.length }}</span>
        </div>
        <div v-if="loading" class="rounded-xl bg-coursia-background p-4 text-sm text-coursia-muted">
          Chargement...
        </div>
        <div v-else class="overflow-x-auto">
          <table class="admin-table">
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
              <tr v-for="price in visiblePrices" :key="String(price.id)">
                <td>{{ price.product_id }}</td>
                <td>{{ price.retailer_id }}</td>
                <td class="font-black">{{ price.amount_chf }} CHF</td>
                <td>{{ qualityLabel(price.quality_status) }}</td>
                <td>{{ price.collected_at }}</td>
                <td>{{ price.source }}</td>
              </tr>
            </tbody>
          </table>
          <BaseButton v-if="hasMorePrices" class="mt-4" type="button" variant="secondary" @click="pricePage += 1">
            Afficher {{ adminPageSize }} prix de plus
          </BaseButton>
        </div>
      </section>

      <form class="rounded-xl border border-coursia-border bg-coursia-surface p-4" @submit.prevent="savePrice">
        <h2 class="text-base font-black">Importer un prix manuel</h2>
        <div class="mt-4 grid gap-2 md:grid-cols-2">
          <label class="grid gap-1 text-sm font-bold">
            ID produit
            <input v-model="form.productId" required />
          </label>
          <label class="grid gap-1 text-sm font-bold">
            ID enseigne
            <input v-model="form.retailerId" required />
          </label>
        </div>
        <div class="mt-3 grid gap-2 md:grid-cols-2">
          <label class="grid gap-1 text-sm font-bold">
            Prix CHF
            <input v-model.number="form.amountChf" required type="number" min="0.01" step="0.01" />
          </label>
          <label class="grid gap-1 text-sm font-bold">
            Prix unité CHF
            <input v-model.number="form.unitPriceChf" type="number" min="0.01" step="0.01" />
          </label>
        </div>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Promotion
          <input v-model="form.promotionLabel" />
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Source
          <input v-model="form.source" required />
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Date de collecte
          <input v-model="form.collectedAt" required />
        </label>
        <BaseButton class="mt-5" type="submit">Enregistrer le prix</BaseButton>
      </form>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <section class="rounded-xl border border-coursia-border bg-coursia-surface p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-black">Historique des prix</h2>
          <span class="text-sm text-coursia-muted">{{ visibleHistory.length }} / {{ history.length }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Avant</th>
                <th>Après</th>
                <th>Source</th>
                <th>Collecte</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in visibleHistory" :key="String(entry.id)">
                <td>{{ entry.product_id }}</td>
                <td>{{ entry.previous_amount_chf ?? '-' }} CHF</td>
                <td class="font-black">{{ entry.amount_chf }} CHF</td>
                <td>{{ entry.source }}</td>
                <td>{{ entry.collected_at }}</td>
              </tr>
            </tbody>
          </table>
          <BaseButton v-if="hasMoreHistory" class="mt-4" type="button" variant="secondary" @click="historyPage += 1">
            Afficher {{ adminPageSize }} lignes de plus
          </BaseButton>
        </div>
      </section>

      <section class="rounded-xl border border-coursia-border bg-coursia-surface p-4">
        <h2 class="text-base font-black">Import CSV avec prévisualisation</h2>
        <p class="mt-2 text-sm text-coursia-muted">Colonnes : {{ retailCsvColumns.join(', ') }}</p>
        <textarea v-model="csvContent" aria-label="Contenu CSV prix" rows="10" class="mt-4 font-mono text-sm" />
        <BaseButton class="mt-4" type="button" variant="secondary" @click="previewCsvImport">
          Prévisualiser l’import
        </BaseButton>
        <div v-if="importPreview" class="mt-4 grid gap-2 md:grid-cols-2">
          <div class="rounded-xl bg-coursia-background p-3">Créations : {{ importPreview.creates }}</div>
          <div class="rounded-xl bg-coursia-background p-3">Mises à jour : {{ importPreview.updates }}</div>
          <div class="rounded-xl bg-coursia-background p-3">Erreurs : {{ importPreview.errors }}</div>
          <div class="rounded-xl bg-coursia-background p-3">Anomalies : {{ importPreview.anomalies }}</div>
        </div>
      </section>
    </div>
  </section>
</template>
