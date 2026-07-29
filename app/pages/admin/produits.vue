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
    (sum, product) => sum + (product.offers?.filter((offer) => offer.latest_price_chf !== null && offer.latest_price_chf !== undefined).length ?? 0),
    0,
  ),
}))

const selectedOffers = computed(() => selectedProduct.value?.offers ?? [])

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatPrice = (value: unknown) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(numberValue)
    : 'Aucun prix'
}

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Jamais'

const resetForm = () => {
  Object.assign(form, createEmptyForm())
  form.retailerId = filters.retailerId || retailers.value[0]?.id || ''
}

const loadRetailers = async () => {
  const response = await $fetch<{ data: RetailerRow[] }>('/api/admin/retailers', {
    query: { limit: 100 },
  })
  retailers.value = response.data
  if (!form.retailerId) {
    form.retailerId = filters.retailerId || retailers.value[0]?.id || ''
  }
}

const loadProducts = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ProductRow[] }>('/api/admin/products', {
      query: productQuery.value,
    })

    products.value = response.data

    if (selectedProduct.value) {
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

const selectProduct = (product: ProductRow) => {
  selectedProduct.value = product
  editorOpen.value = false
  editingProductId.value = null
}

const startCreate = () => {
  selectedProduct.value = null
  editingProductId.value = null
  resetForm()
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

const startEdit = (product = selectedProduct.value) => {
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

const closeEditor = () => {
  editorOpen.value = false
  editingProductId.value = null
  resetForm()
}

const saveProduct = async () => {
  saving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const endpoint = editingProductId.value ? `/api/admin/products/${editingProductId.value}` : '/api/admin/products'
    const method = editingProductId.value ? 'PUT' : 'POST'
    const response = await $fetch<{ data: ProductRow }>(endpoint, { method, body: form })

    feedback.value = editingProductId.value ? 'Produit et offre magasin mis à jour.' : 'Produit et offre magasin créés.'
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

const clearFilters = async () => {
  filters.search = ''
  filters.retailerId = ''
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
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">Comparateur</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
          Produits et offres magasin
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Produits canoniques liés aux enseignes. Ces offres alimentent ensuite les prix et les paniers mobile.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadProducts">
          Rafraîchir
        </BaseButton>
        <BaseButton type="button" :disabled="retailers.length === 0" @click="startCreate">
          Nouveau produit
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article class="admin-stat-card">
        <span>Produits</span>
        <strong>{{ stats.products }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Offres</span>
        <strong class="text-coursia-primary">{{ stats.offers }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Offres actives</span>
        <strong class="text-coursia-success">{{ stats.activeOffers }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Offres avec prix</span>
        <strong>{{ stats.pricedOffers }}</strong>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1.2fr_0.8fr_auto]" @submit.prevent="loadProducts">
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Nom produit ou rayon..." />
      </label>
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
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

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex items-center justify-between gap-4 border-b border-coursia-border px-4 py-3">
          <div>
            <h2 class="text-base font-black text-coursia-foreground">Catalogue produits</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ selectedRetailerName }}</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Live Supabase' }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-4 text-sm text-coursia-muted">
          Chargement des produits...
        </div>

        <div v-else-if="products.length === 0" class="grid place-items-center p-10 text-center">
          <div class="max-w-sm">
            <p class="font-black text-coursia-foreground">Aucun produit pour ce filtre</p>
            <p class="mt-2 text-sm text-coursia-muted">
              Crée un produit avec une enseigne pour générer une offre magasin utilisable par le comparateur.
            </p>
            <div class="mt-4 flex justify-center gap-2">
              <BaseButton v-if="filters.search || filters.retailerId" type="button" variant="secondary" @click="clearFilters">
                Réinitialiser
              </BaseButton>
              <BaseButton type="button" :disabled="retailers.length === 0" @click="startCreate">Créer</BaseButton>
            </div>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-[58rem]">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Offres magasin</th>
                <th>Dernier prix</th>
                <th>Rayon mobile</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="product in products"
                :key="product.id"
                class="cursor-pointer transition"
                :class="selectedProduct?.id === product.id ? 'bg-coursia-primary/10 shadow-[inset_4px_0_0_var(--color-coursia-primary)]' : ''"
                @click="selectProduct(product)"
              >
                <td>
                  <span class="block max-w-[20rem] truncate font-black text-coursia-foreground">{{ product.name }}</span>
                  <span class="mt-1 block max-w-[20rem] truncate text-xs text-coursia-muted">{{ product.slug }}</span>
                </td>
                <td>
                  <div class="flex max-w-[22rem] flex-wrap gap-1.5">
                    <BaseBadge
                      v-for="offer in product.offers?.slice(0, 2)"
                      :key="offer.id"
                      :tone="offer.active ? 'primary' : 'neutral'"
                    >
                      {{ offer.retailer_name }} · {{ offer.format }}
                    </BaseBadge>
                    <span v-if="!product.offers?.length" class="text-xs text-coursia-muted">Aucune offre</span>
                  </div>
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ formatPrice(product.offers?.find((offer) => offer.latest_price_chf)?.latest_price_chf) }}
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ product.mobile?.aisle || 'Non classé' }}
                </td>
                <td @click.stop>
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="secondary" type="button" @click="startEdit(product)">
                      Modifier
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="grid gap-4">
        <section v-if="editorOpen" class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">
                {{ editingProductId ? 'Modification' : 'Création' }}
              </p>
              <h2 class="mt-1 text-lg font-black text-coursia-foreground">Produit + offre</h2>
            </div>
            <button type="button" class="cursor-pointer rounded-xl px-3 py-2 text-sm font-black text-coursia-muted transition hover:bg-coursia-surface-muted" @click="closeEditor">
              Fermer
            </button>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="saveProduct">
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Enseigne
              <select v-model="form.retailerId" required>
                <option value="" disabled>Choisir une enseigne</option>
                <option v-for="retailer in retailers" :key="retailer.id" :value="retailer.id">
                  {{ retailer.name }}
                </option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Nom produit
              <input v-model="form.name" required placeholder="Ex. Penne rigate" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Slug
              <input v-model="form.slug" required placeholder="penne-rigate-500g" />
            </label>
            <div class="grid grid-cols-[1fr_0.65fr_0.55fr] gap-2">
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Format
                <input v-model="form.format.label" required placeholder="500 g" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Quantité
                <input v-model.number="form.format.quantity" required type="number" min="0.01" step="0.01" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Unité
                <select v-model="form.format.unit">
                  <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
                </select>
              </label>
            </div>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Source
              <input v-model="form.source" required placeholder="saisie_admin, coop.ch..." />
            </label>

            <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-black text-coursia-foreground">Impact mobile</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">
                La sauvegarde crée ou met à jour le produit canonique et son offre magasin pour l’enseigne sélectionnée.
                Les prix se saisissent ensuite dans l’onglet Prix.
              </p>
            </div>

            <div class="flex flex-wrap gap-2 border-t border-coursia-border pt-4">
              <BaseButton type="submit" :disabled="saving || !form.retailerId">
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </BaseButton>
              <BaseButton type="button" variant="secondary" @click="closeEditor">Annuler</BaseButton>
            </div>
          </form>
        </section>

        <section v-else class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div v-if="!selectedProduct" class="grid place-items-center rounded-2xl bg-coursia-surface-muted p-8 text-center">
            <div>
              <p class="font-black text-coursia-foreground">Sélectionne un produit</p>
              <p class="mt-2 text-sm text-coursia-muted">Ses offres magasin et son dernier prix apparaîtront ici.</p>
            </div>
          </div>

          <template v-else>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="truncate text-lg font-black text-coursia-foreground">{{ selectedProduct.name }}</h2>
                <p class="mt-1 truncate text-sm text-coursia-muted">{{ selectedProduct.slug }}</p>
              </div>
              <BaseBadge :tone="selectedOffers.length ? 'primary' : 'neutral'">
                {{ selectedOffers.length }} offre(s)
              </BaseBadge>
            </div>

            <div class="mt-4 grid gap-2">
              <article
                v-for="offer in selectedOffers"
                :key="offer.id"
                class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-black text-coursia-foreground">{{ offer.retailer_name }}</p>
                    <p class="mt-1 text-xs text-coursia-muted">{{ offer.format }} · {{ offer.quantity }} {{ offer.unit }}</p>
                  </div>
                  <BaseBadge :tone="offer.active ? 'success' : 'neutral'">
                    {{ offer.active ? 'Active' : 'Inactive' }}
                  </BaseBadge>
                </div>
                <p class="mt-3 text-sm font-black text-coursia-foreground">{{ formatPrice(offer.latest_price_chf) }}</p>
                <p class="mt-1 text-xs text-coursia-muted">Collecte : {{ formatDate(offer.latest_price_collected_at) }}</p>
              </article>
              <p v-if="selectedOffers.length === 0" class="rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
                Aucune offre liée. Modifie ce produit pour créer une offre magasin.
              </p>
            </div>

            <div class="mt-4 grid gap-2">
              <BaseButton type="button" @click="startEdit()">Modifier produit/offre</BaseButton>
              <NuxtLink class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-foreground transition hover:bg-coursia-surface-muted" to="/admin/prix">
                Ajouter un prix
              </NuxtLink>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </section>
</template>
