<script setup lang="ts">
import { retailCsvColumns, retailCsvTemplate, type PriceEntryInput, type RetailImportPreview } from '#shared/validation/retail-catalog'
import { webQualityBudgets } from '#shared/quality/performance-budgets'

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

const loadPrices = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/prices', {
    query: filters,
  })
  prices.value = response.data
  pricePage.value = 1
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
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-102</p>
        <h1 class="mt-2 text-3xl font-black">Prix et qualité du comparateur</h1>
        <p class="mt-3 text-coursia-muted">
          Prix courant, promotions, source, date de collecte, historique, prix périmés, variations anormales et preview CSV.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="loadHistory">Historique</BaseButton>
        <BaseButton type="button" @click="loadPrices">Rafraîchir</BaseButton>
      </div>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-2">
      <input v-model="filters.retailerId" aria-label="Filtrer les prix par ID enseigne" placeholder="Filtrer par ID enseigne" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <select v-model="filters.quality" aria-label="Filtrer les prix par qualité" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous états qualité</option>
        <option value="fresh">Frais</option>
        <option value="stale">Périmé</option>
        <option value="anomaly">Variation anormale</option>
      </select>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="savePrice">
        <h2 class="text-2xl font-black">Import manuel dâ€™un prix</h2>
        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            ID produit
            <input v-model="form.productId" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            ID enseigne
            <input v-model="form.retailerId" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
        </div>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            Prix courant CHF
            <input v-model.number="form.amountChf" required type="number" min="0.01" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Prix unité CHF
            <input v-model.number="form.unitPriceChf" type="number" min="0.01" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
        </div>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Promotion
          <input v-model="form.promotionLabel" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Source
          <input v-model="form.source" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Date de collecte
          <input v-model="form.collectedAt" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <BaseButton class="mt-6" type="submit">Enregistrer le prix</BaseButton>
      </form>

      <section class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-2xl font-black">Import CSV avec prévisualisation</h2>
        <p class="mt-3 text-sm text-coursia-muted">Colonnes : {{ retailCsvColumns.join(', ') }}</p>
        <textarea v-model="csvContent" aria-label="Contenu CSV prix" rows="10" class="mt-5 w-full rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 font-mono text-sm" />
        <BaseButton class="mt-4" type="button" variant="secondary" @click="previewCsvImport">Prévisualiser lâ€™import</BaseButton>
        <div v-if="importPreview" class="mt-5 grid gap-3 md:grid-cols-4">
          <div class="rounded-2xl bg-coursia-background p-4">Créations : {{ importPreview.creates }}</div>
          <div class="rounded-2xl bg-coursia-background p-4">Mises a jour : {{ importPreview.updates }}</div>
          <div class="rounded-2xl bg-coursia-background p-4">Erreurs : {{ importPreview.errors }}</div>
          <div class="rounded-2xl bg-coursia-background p-4">Anomalies : {{ importPreview.anomalies }}</div>
        </div>
      </section>
    </div>

    <section class="mt-8 grid gap-5 lg:grid-cols-2">
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Prix courants signalés</h2>
        <div class="mt-4 grid gap-3 content-auto">
          <div v-for="price in visiblePrices" :key="String(price.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
            {{ price.amount_chf }} CHF · {{ price.quality_status }} · {{ price.source }} · collecte {{ price.collected_at }}
          </div>
          <BaseButton v-if="hasMorePrices" type="button" variant="secondary" @click="pricePage += 1">
            Afficher 50 prix de plus
          </BaseButton>
        </div>
      </article>
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Historique des prix</h2>
        <div class="mt-4 grid gap-3 content-auto">
          <div v-for="entry in visibleHistory" :key="String(entry.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
            {{ entry.previous_amount_chf ?? '-' }} â†’ {{ entry.amount_chf }} CHF · {{ entry.source }} · {{ entry.collected_at }}
          </div>
          <BaseButton v-if="hasMoreHistory" type="button" variant="secondary" @click="historyPage += 1">
            Afficher 50 lignes d historique de plus
          </BaseButton>
        </div>
      </article>
    </section>
  </section>
</template>
