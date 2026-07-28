<script setup lang="ts">
import { webQualityBudgets } from '#shared/quality/performance-budgets'
import { productUnitSchema, type ProductInput } from '#shared/validation/retail-catalog'

definePageMeta({
  layout: 'admin',
})

const createEmptyForm = (): ProductInput => ({
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

const form = reactive<ProductInput>(createEmptyForm())

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
const loading = ref(false)
const unitOptions = productUnitSchema.options

const resetForm = () => {
  selectedProductId.value = null
  Object.assign(form, createEmptyForm())
}

const parseFormat = (value: unknown): ProductInput['format'] => {
  if (value && typeof value === 'object') {
    const format = value as Record<string, unknown>
    return {
      label: String(format.label ?? '500 g'),
      quantity: Number(format.quantity ?? 500),
      unit: productUnitSchema.safeParse(format.unit).success ? format.unit as ProductInput['format']['unit'] : 'g',
    }
  }

  return { label: '500 g', quantity: 500, unit: 'g' }
}

const selectProduct = (product: Record<string, unknown>) => {
  selectedProductId.value = String(product.id)
  Object.assign(form, {
    retailerId: String(product.retailer_id ?? product.retailerId ?? ''),
    name: String(product.name ?? ''),
    slug: String(product.slug ?? ''),
    brand: String(product.brand ?? ''),
    status: product.status === 'archived' ? 'archived' : 'active',
    format: parseFormat(product.format),
    source: String(product.source ?? ''),
  })
}

const loadProducts = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/products', {
      query: filters,
    })
    products.value = response.data
    productPage.value = 1
  } finally {
    loading.value = false
  }
}

const saveProduct = async () => {
  const endpoint = selectedProductId.value ? `/api/admin/products/${selectedProductId.value}` : '/api/admin/products'
  const method = selectedProductId.value ? 'PUT' : 'POST'

  await $fetch(endpoint, { method, body: form })
  feedback.value = selectedProductId.value ? 'Produit modifié et audité.' : 'Produit créé et audité.'
  await loadProducts()
}

onMounted(() => {
  void loadProducts()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-102</p>
        <h1 class="mt-2 text-3xl font-black">Produits et formats</h1>
        <p class="mt-3 text-coursia-muted">
          Gestion des produits comparables : enseigne, marque, format, unité, source et statut.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="resetForm">Nouveau produit</BaseButton>
        <BaseButton type="button" :disabled="loading" @click="loadProducts">Rafraîchir</BaseButton>
      </div>
    </div>

    <form class="admin-toolbar grid gap-3 md:grid-cols-[1fr_18rem_14rem_auto]" @submit.prevent="loadProducts">
      <label class="grid gap-1 text-sm font-bold">
        Recherche
        <input v-model="filters.search" type="search" aria-label="Recherche produit" placeholder="Nom, slug, marque..." />
      </label>
      <label class="grid gap-1 text-sm font-bold">
        Enseigne
        <input v-model="filters.retailerId" aria-label="Filtrer par ID enseigne" placeholder="ID enseigne" />
      </label>
      <label class="grid gap-1 text-sm font-bold">
        Statut
        <select v-model="filters.status" aria-label="Filtrer par statut produit">
          <option value="">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="archived">Archivé</option>
        </select>
      </label>
      <div class="flex items-end">
        <BaseButton type="submit" class="w-full" :disabled="loading">Filtrer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-xl border border-coursia-border bg-coursia-surface px-4 py-3 text-sm font-semibold">
      {{ feedback }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_29rem]">
      <section class="rounded-xl border border-coursia-border bg-coursia-surface p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-black">Catalogue produits</h2>
          <span class="text-sm text-coursia-muted">{{ visibleProducts.length }} / {{ products.length }}</span>
        </div>

        <div v-if="loading" class="rounded-xl bg-coursia-background p-4 text-sm text-coursia-muted">
          Chargement...
        </div>
        <div v-else class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Format</th>
                <th>Enseigne</th>
                <th>Source</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in visibleProducts" :key="String(product.id)">
                <td>
                  <button type="button" class="max-w-[22rem] text-left" @click="selectProduct(product)">
                    <span class="block truncate font-black">{{ product.name }}</span>
                    <span class="block truncate text-xs text-coursia-muted">{{ product.slug }} · {{ product.brand || 'sans marque' }}</span>
                  </button>
                </td>
                <td>{{ product.format }}</td>
                <td>{{ product.retailer_id }}</td>
                <td>{{ product.source }}</td>
                <td class="text-right">
                  <BaseButton size="sm" variant="secondary" type="button" @click="selectProduct(product)">Modifier</BaseButton>
                </td>
              </tr>
            </tbody>
          </table>

          <BaseButton v-if="hasMoreProducts" class="mt-4" type="button" variant="secondary" @click="productPage += 1">
            Afficher {{ productPageSize }} produits de plus
          </BaseButton>
        </div>
      </section>

      <form class="rounded-xl border border-coursia-border bg-coursia-surface p-4" @submit.prevent="saveProduct">
        <h2 class="text-base font-black">{{ selectedProductId ? 'Modifier le produit' : 'Créer un produit' }}</h2>
        <label class="mt-4 grid gap-1 text-sm font-bold">
          ID enseigne
          <input v-model="form.retailerId" required />
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Nom produit
          <input v-model="form.name" required />
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Slug
          <input v-model="form.slug" required />
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Marque
          <input v-model="form.brand" />
        </label>
        <div class="mt-3 grid gap-2 md:grid-cols-3">
          <label class="grid gap-1 text-sm font-bold">
            Format
            <input v-model="form.format.label" required />
          </label>
          <label class="grid gap-1 text-sm font-bold">
            Quantité
            <input v-model.number="form.format.quantity" required type="number" min="0.01" step="0.01" />
          </label>
          <label class="grid gap-1 text-sm font-bold">
            Unité
            <select v-model="form.format.unit">
              <option v-for="unit in unitOptions" :key="unit">{{ unit }}</option>
            </select>
          </label>
        </div>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Source
          <input v-model="form.source" required />
        </label>
        <BaseButton class="mt-5" type="submit">Enregistrer</BaseButton>
      </form>
    </div>
  </section>
</template>
