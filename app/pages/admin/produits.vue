<script setup lang="ts">
import { productUnitSchema, type ProductInput } from '#shared/validation/retail-catalog'
import { webQualityBudgets } from '#shared/quality/performance-budgets'

definePageMeta({
  layout: 'admin',
})

const form = reactive<ProductInput>({
  retailerId: '00000000-0000-4000-8000-000000000001',
  name: '',
  slug: '',
  brand: '',
  status: 'active',
  format: {
    label: '500 g',
    quantity: 500,
    unit: 'g',
  },
  source: '',
})

const filters = reactive({
  search: '',
  retailerId: '',
  status: '',
})

const products = ref<Array<Record<string, unknown>>>([])
const productPage = ref(1)
const productPageSize = webQualityBudgets.adminPages.maxInitialRows
const visibleProducts = computed(() =>
  products.value.slice((productPage.value - 1) * productPageSize, productPage.value * productPageSize),
)
const hasMoreProducts = computed(() => products.value.length > productPage.value * productPageSize)
const selectedProductId = ref<string | null>(null)
const feedback = ref('')
const unitOptions = productUnitSchema.options

const loadProducts = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/products', {
    query: filters,
  })
  products.value = response.data
  productPage.value = 1
}

const saveProduct = async () => {
  const endpoint = selectedProductId.value ? `/api/admin/products/${selectedProductId.value}` : '/api/admin/products'
  const method = selectedProductId.value ? 'PUT' : 'POST'

  await $fetch(endpoint, { method, body: form })
  feedback.value = selectedProductId.value ? 'Produit modifié et audité.' : 'Produit créé et audité.'
  await loadProducts()
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-102</p>
        <h1 class="mt-2 text-3xl font-black">Produits et formats</h1>
        <p class="mt-3 text-coursia-muted">
          Gestion des produits comparables : enseigne, marque, format, unité, source et statut.
        </p>
      </div>
      <BaseButton type="button" @click="loadProducts">Rafraîchir</BaseButton>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-3">
      <input v-model="filters.search" type="search" aria-label="Recherche produit" placeholder="Recherche produit" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <input v-model="filters.retailerId" aria-label="Filtrer par ID enseigne" placeholder="ID enseigne" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <select v-model="filters.status" aria-label="Filtrer par statut produit" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous statuts</option>
        <option value="active">Actif</option>
        <option value="archived">Archivé</option>
      </select>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <section class="grid gap-4 content-auto">
        <article v-for="product in visibleProducts" :key="String(product.id)" class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-xl font-black">{{ product.name }}</h2>
          <p class="mt-2 text-sm text-coursia-muted">
            {{ product.slug }} · enseigne {{ product.retailer_id }} · format {{ product.format }}
          </p>
          <p class="mt-2 text-xs text-coursia-muted">Source : {{ product.source }}</p>
        </article>
        <BaseButton
          v-if="hasMoreProducts"
          type="button"
          variant="secondary"
          @click="productPage += 1"
        >
          Afficher 50 produits de plus
        </BaseButton>
      </section>

      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveProduct">
        <h2 class="text-2xl font-black">Créer ou modifier un produit</h2>
        <label class="mt-5 grid gap-2 text-sm font-bold">
          ID enseigne
          <input v-model="form.retailerId" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Nom produit
          <input v-model="form.name" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Slug
          <input v-model="form.slug" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Marque
          <input v-model="form.brand" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <div class="mt-4 grid gap-3 md:grid-cols-3">
          <label class="grid gap-2 text-sm font-bold">
            Format
            <input v-model="form.format.label" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Quantité
            <input v-model.number="form.format.quantity" required type="number" min="0.01" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Unité
            <select v-model="form.format.unit" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
              <option v-for="unit in unitOptions" :key="unit">{{ unit }}</option>
            </select>
          </label>
        </div>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Source
          <input v-model="form.source" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <BaseButton class="mt-6" type="submit">Enregistrer le produit</BaseButton>
      </form>
    </div>
  </section>
</template>
