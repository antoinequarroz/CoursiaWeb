<script setup lang="ts">
import {
  buildUnitComparison,
  findAmbiguousMatches,
  type IngredientProductMatchInput,
} from '#shared/validation/ingredient-product-matching'

definePageMeta({
  layout: 'admin',
})

type MatchStatus = IngredientProductMatchInput['status']
type ProductUnit = IngredientProductMatchInput['unitComparison']['ingredientUnit']
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type IngredientRow = {
  id: string
  name: string
  slug: string
  units: ProductUnit[]
  categories: string[]
  mobile?: {
    defaultUnit?: string | null
    aisle?: string | null
  }
}

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
  unit: ProductUnit | string
  active: boolean
  latest_price_chf?: number | string | null
}

type ProductRow = {
  id: string
  name: string
  slug: string
  offers?: ProductOffer[]
  mobile?: {
    aisle?: string | null
    ingredientId?: string | null
  }
}

type MatchRecord = {
  id: string
  ingredient_id: string | null
  product_id: string
  retailer_id: string | null
  confidence: number
  status: MatchStatus
  source: 'automatic' | 'manual'
  notes?: string | null
  product_name?: string | null
  ingredient_name?: string | null
  retailer_name?: string | null
  offer_id?: string | null
  offer_format?: string | null
  offer_unit?: string | null
  offer_quantity?: number | null
}

type OfferOption = ProductOffer & {
  product_id: string
  product_name: string
  product_slug: string
  linked_ingredient_id?: string | null
}

const statusOptions: Array<{ value: MatchStatus; label: string }> = [
  { value: 'suggested', label: 'Suggestion' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'ambiguous', label: 'Ambiguë' },
  { value: 'rejected', label: 'Rejetée' },
]

const unitOptions: ProductUnit[] = ['g', 'kg', 'ml', 'l', 'piece', 'pack']
const route = useRoute()
const router = useRouter()

const filters = reactive({
  ingredientId: typeof route.query.ingredientId === 'string' ? route.query.ingredientId : '',
  retailerId: typeof route.query.retailerId === 'string' ? route.query.retailerId : '',
  status: typeof route.query.status === 'string' ? route.query.status : '',
})

const form = reactive<IngredientProductMatchInput>({
  ingredientId: '',
  productId: '',
  retailerId: '',
  confidence: 0.85,
  status: 'suggested',
  source: 'manual',
  unitComparison: buildUnitComparison('g', 'g'),
  notes: '',
})

const ingredients = ref<IngredientRow[]>([])
const retailers = ref<RetailerRow[]>([])
const products = ref<ProductRow[]>([])
const matches = ref<MatchRecord[]>([])
const unmatched = ref<IngredientRow[]>([])
const selectedMatch = ref<MatchRecord | null>(null)
const selectedOfferKey = ref('')
const impact = ref<Record<string, unknown> | null>(null)
const feedback = ref('')
const errorMessage = ref('')
const loading = ref(false)
const saving = ref(false)
const actionPending = ref('')

const matchQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }
  if (filters.ingredientId) query.ingredientId = filters.ingredientId
  if (filters.retailerId) query.retailerId = filters.retailerId
  if (filters.status) query.status = filters.status
  return query
})

const offerOptions = computed<OfferOption[]>(() =>
  products.value.flatMap((product) =>
    (product.offers ?? []).map((offer) => ({
      ...offer,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      linked_ingredient_id: product.mobile?.ingredientId ?? null,
    })),
  ).filter((offer) => !filters.retailerId || offer.retailer_id === filters.retailerId),
)

const selectedIngredient = computed(() =>
  ingredients.value.find((ingredient) => ingredient.id === form.ingredientId) ?? null,
)

const selectedOffer = computed(() =>
  offerOptions.value.find((offer) => `${offer.product_id}:${offer.retailer_id}` === selectedOfferKey.value) ?? null,
)

const ambiguousPreview = computed(() =>
  findAmbiguousMatches(matches.value.map((match) => ({
    status: match.status,
    confidence: Number(match.confidence ?? 0),
  }))),
)

const stats = computed(() => ({
  matches: matches.value.length,
  confirmed: matches.value.filter((match) => match.status === 'confirmed').length,
  ambiguous: ambiguousPreview.value.length,
  unmatched: unmatched.value.length,
}))

const statusLabel = (status: unknown) =>
  statusOptions.find((option) => option.value === status)?.label ?? String(status || 'Inconnu')

const statusTone = (status: unknown): BadgeTone => {
  if (status === 'confirmed') return 'success'
  if (status === 'ambiguous') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'neutral'
}

const confidenceTone = (confidence: unknown): BadgeTone => {
  const value = Number(confidence ?? 0)
  if (value >= 0.85) return 'success'
  if (value >= 0.5) return 'warning'
  return 'danger'
}

const normalizeUnit = (unit: unknown): ProductUnit => {
  if (unit === 'unite') return 'piece'
  return unitOptions.includes(unit as ProductUnit) ? unit as ProductUnit : 'piece'
}

const estimateConfidence = (ingredientName: string, productName: string) => {
  const ingredientTokens = new Set(ingredientName.toLowerCase().split(/\s+/).filter(Boolean))
  const productTokens = new Set(productName.toLowerCase().split(/\s+/).filter(Boolean))
  const overlap = [...ingredientTokens].filter((token) => productTokens.has(token)).length
  return ingredientTokens.size === 0 ? 0 : Number((overlap / ingredientTokens.size).toFixed(2))
}

const refreshUnitComparison = () => {
  form.unitComparison = buildUnitComparison(
    normalizeUnit(form.unitComparison.ingredientUnit),
    normalizeUnit(form.unitComparison.productUnit),
  )
}

const syncFormFromSelection = () => {
  if (selectedIngredient.value) {
    form.unitComparison.ingredientUnit = normalizeUnit(selectedIngredient.value.units?.[0] ?? selectedIngredient.value.mobile?.defaultUnit ?? 'g')
  }

  if (selectedOffer.value) {
    form.productId = selectedOffer.value.product_id
    form.retailerId = selectedOffer.value.retailer_id
    form.unitComparison.productUnit = normalizeUnit(selectedOffer.value.unit)
  }

  refreshUnitComparison()

  if (selectedIngredient.value && selectedOffer.value) {
    form.confidence = Math.max(0.35, estimateConfidence(selectedIngredient.value.name, selectedOffer.value.product_name))
    form.status = form.confidence >= 0.85 && form.unitComparison.comparable ? 'suggested' : 'ambiguous'
  }
}

const persistSelection = () => {
  void router.replace({
    query: {
      ingredientId: filters.ingredientId || form.ingredientId || undefined,
      retailerId: filters.retailerId || form.retailerId || undefined,
      status: filters.status || undefined,
      offer: selectedOfferKey.value || undefined,
      match: selectedMatch.value?.id || undefined,
    },
  })
}

const formatPrice = (value: unknown) => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue)
    ? new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(numberValue)
    : 'Aucun prix'
}

const loadReferenceData = async () => {
  const [ingredientResponse, retailerResponse, productResponse] = await Promise.all([
    $fetch<{ data: IngredientRow[] }>('/api/admin/ingredients', { query: { limit: 100 } }),
    $fetch<{ data: RetailerRow[] }>('/api/admin/retailers', { query: { limit: 100 } }),
    $fetch<{ data: ProductRow[] }>('/api/admin/products', { query: { limit: 100 } }),
  ])

  ingredients.value = ingredientResponse.data
  retailers.value = retailerResponse.data
  products.value = productResponse.data

  if (!form.ingredientId && ingredients.value[0]) form.ingredientId = ingredients.value[0].id

  if (typeof route.query.ingredientId === 'string') {
    const requestedIngredient = ingredients.value.find((ingredient) => ingredient.id === route.query.ingredientId)
    if (requestedIngredient) form.ingredientId = requestedIngredient.id
  }

  if (!form.productId && offerOptions.value[0]) {
    form.productId = offerOptions.value[0].product_id
    form.retailerId = offerOptions.value[0].retailer_id
    selectedOfferKey.value = `${offerOptions.value[0].product_id}:${offerOptions.value[0].retailer_id}`
  }

  if (typeof route.query.offer === 'string') {
    const requestedOffer = offerOptions.value.find((offer) => `${offer.product_id}:${offer.retailer_id}` === route.query.offer)
    if (requestedOffer) {
      form.productId = requestedOffer.product_id
      form.retailerId = requestedOffer.retailer_id
      selectedOfferKey.value = `${requestedOffer.product_id}:${requestedOffer.retailer_id}`
    }
  }

  syncFormFromSelection()
}

const loadMatches = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: MatchRecord[] }>('/api/admin/matching', {
      query: matchQuery.value,
    })

    matches.value = response.data
    const requestedMatchId = typeof route.query.match === 'string' ? route.query.match : null
    if (requestedMatchId) {
      selectedMatch.value = matches.value.find((match) => match.id === requestedMatchId) ?? null
    }
    if (selectedMatch.value) {
      selectedMatch.value = matches.value.find((match) => match.id === selectedMatch.value?.id && match.retailer_id === selectedMatch.value?.retailer_id) ?? null
    }
    if (!selectedMatch.value && matches.value[0]) selectedMatch.value = matches.value[0]
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

const loadUnmatched = async () => {
  const response = await $fetch<{ data: IngredientRow[] }>('/api/admin/matching/unmatched')
  unmatched.value = response.data
}

const saveMatch = async () => {
  saving.value = true
  errorMessage.value = ''
  feedback.value = ''

  try {
    syncFormFromSelection()
    const response = await $fetch<{ data: MatchRecord }>('/api/admin/matching', { method: 'POST', body: form })
    feedback.value = form.status === 'confirmed' ? 'Correspondance confirmée.' : 'Correspondance créée pour revue.'
    selectedMatch.value = response.data
    await Promise.all([loadReferenceData(), loadMatches(), loadUnmatched()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

const updateMatch = async (match: MatchRecord, status: 'confirmed' | 'ambiguous' | 'rejected') => {
  actionPending.value = `${match.id}:${status}`
  feedback.value = ''
  errorMessage.value = ''

  try {
    await $fetch(`/api/admin/matching/${match.product_id}`, {
      method: 'PUT',
      body: {
        ingredientId: match.ingredient_id ?? (form.ingredientId || undefined),
        retailerId: match.retailer_id ?? undefined,
        confidence: status === 'confirmed' ? Math.max(0.85, Number(match.confidence ?? 0)) : Number(match.confidence ?? 0),
        status,
        unitComparison: {
          ingredientUnit: normalizeUnit(match.offer_unit ?? 'piece'),
          productUnit: normalizeUnit(match.offer_unit ?? 'piece'),
          comparable: true,
        },
        notes: status === 'confirmed' ? 'Confirmation manuelle' : 'Cas à vérifier',
      },
    })
    feedback.value = status === 'confirmed'
      ? 'Correspondance confirmée manuellement.'
      : 'Statut mis à jour sans validation silencieuse.'
    await Promise.all([loadReferenceData(), loadMatches(), loadUnmatched()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Mise à jour impossible.'
  } finally {
    actionPending.value = ''
  }
}

const loadImpact = async (ingredientId?: string | null) => {
  const selectedIngredientId = ingredientId || selectedMatch.value?.ingredient_id || filters.ingredientId || form.ingredientId

  if (!selectedIngredientId) {
    errorMessage.value = 'Choisis un ingrédient avant de calculer l’impact.'
    return
  }

  const response = await $fetch<{ data: Record<string, unknown> }>('/api/admin/matching/impact', {
    query: { ingredientId: selectedIngredientId },
  })
  impact.value = response.data
}

const useUnmatchedIngredient = (ingredient: IngredientRow) => {
  form.ingredientId = ingredient.id
  filters.ingredientId = ingredient.id
  syncFormFromSelection()
  persistSelection()
}

const useMatchAsForm = (match: MatchRecord) => {
  selectedMatch.value = match
  form.ingredientId = match.ingredient_id ?? form.ingredientId
  form.productId = match.product_id
  form.retailerId = match.retailer_id ?? form.retailerId
  selectedOfferKey.value = `${form.productId}:${form.retailerId}`
  form.confidence = Number(match.confidence ?? 0.85)
  form.status = match.status
  form.notes = match.notes ?? ''
  syncFormFromSelection()
  persistSelection()
}

const applyFilters = async () => {
  persistSelection()
  await loadMatches()
}

const clearFilters = async () => {
  filters.ingredientId = ''
  filters.retailerId = ''
  filters.status = ''
  void router.replace({
    query: {
      offer: selectedOfferKey.value || undefined,
      match: selectedMatch.value?.id || undefined,
    },
  })
  await loadMatches()
}

watch(() => [form.ingredientId, selectedOfferKey.value], () => {
  syncFormFromSelection()
  persistSelection()
})

onMounted(async () => {
  await loadReferenceData()
  await Promise.all([loadMatches(), loadUnmatched()])
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">Comparateur</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Correspondances ingrédients-produits
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-coursia-muted">
          Relie les ingrédients des recettes aux offres magasin. Une correspondance confirmée alimente les paniers et la comparaison mobile.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadMatches">
          Rafraîchir
        </BaseButton>
        <BaseButton type="button" variant="secondary" @click="loadUnmatched">
          Ingrédients sans produit
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article class="admin-stat-card">
        <span>Correspondances</span>
        <strong>{{ stats.matches }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Confirmées</span>
        <strong class="text-coursia-success">{{ stats.confirmed }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Ambiguës</span>
        <strong class="text-coursia-warning">{{ stats.ambiguous }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Sans produit</span>
        <strong>{{ stats.unmatched }}</strong>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1fr_1fr_0.8fr_auto]" @submit.prevent="applyFilters">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Ingrédient
        <select v-model="filters.ingredientId">
          <option value="">Tous les ingrédients</option>
          <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
            {{ ingredient.name }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Enseigne
        <select v-model="filters.retailerId">
          <option value="">Toutes les enseignes</option>
          <option v-for="retailer in retailers" :key="retailer.id" :value="retailer.id">
            {{ retailer.name }}
          </option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Statut
        <select v-model="filters.status">
          <option value="">Tous statuts</option>
          <option v-for="status in statusOptions" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton v-if="filters.ingredientId || filters.retailerId || filters.status" type="button" variant="ghost" @click="clearFilters">
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
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex items-center justify-between gap-4 border-b border-coursia-border px-4 py-3">
          <div>
            <h2 class="text-base font-semibold text-coursia-text">Matrice de correspondance</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ matches.length }} ligne(s) affichée(s)</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Données réelles' }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-4 text-sm text-coursia-muted">
          Chargement des correspondances...
        </div>

        <div v-else-if="matches.length === 0" class="grid place-items-center p-10 text-center">
          <div class="max-w-sm">
            <p class="font-semibold text-coursia-text">Aucune correspondance</p>
            <p class="mt-2 text-sm text-coursia-muted">
              Crée d’abord des produits/offres magasin, puis relie-les à des ingrédients.
            </p>
            <NuxtLink class="mt-4 inline-flex cursor-pointer rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-text transition hover:bg-coursia-surface-muted" to="/admin/produits">
              Aller aux produits
            </NuxtLink>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-[62rem]">
            <thead>
              <tr>
                <th>Ingrédient</th>
                <th>Produit magasin</th>
                <th>Enseigne</th>
                <th>Confiance</th>
                <th>Statut</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="match in matches"
                :key="`${match.product_id}:${match.retailer_id ?? 'none'}`"
                class="cursor-pointer transition"
                :class="selectedMatch?.product_id === match.product_id && selectedMatch?.retailer_id === match.retailer_id ? 'bg-coursia-primary/10' : ''"
                @click="useMatchAsForm(match)"
              >
                <td>
                  <span class="block max-w-[18rem] truncate font-semibold text-coursia-text">
                    {{ match.ingredient_name || 'Non relié' }}
                  </span>
                  <span class="mt-1 block max-w-[18rem] truncate text-xs text-coursia-muted">
                    {{ match.ingredient_id || 'Choisir un ingrédient' }}
                  </span>
                </td>
                <td>
                  <span class="block max-w-[20rem] truncate font-semibold text-coursia-text">{{ match.product_name }}</span>
                  <span class="mt-1 block text-xs text-coursia-muted">
                    {{ match.offer_format || 'Format non renseigné' }}
                  </span>
                </td>
                <td class="text-sm text-coursia-muted">{{ match.retailer_name || 'Aucune enseigne' }}</td>
                <td>
                  <BaseBadge :tone="confidenceTone(match.confidence)">
                    {{ Math.round(Number(match.confidence ?? 0) * 100) }} %
                  </BaseBadge>
                </td>
                <td>
                  <BaseBadge :tone="statusTone(match.status)">
                    {{ statusLabel(match.status) }}
                  </BaseBadge>
                </td>
                <td @click.stop>
                  <div class="flex justify-end gap-2">
                    <BaseButton
                      size="sm"
                      type="button"
                      :disabled="!match.ingredient_id || actionPending === `${match.id}:confirmed`"
                      @click="updateMatch(match, 'confirmed')"
                    >
                      Confirmer
                    </BaseButton>
                    <BaseButton size="sm" type="button" variant="secondary" :disabled="actionPending === `${match.id}:ambiguous`" @click="updateMatch(match, 'ambiguous')">
                      Ambigu
                    </BaseButton>
                    <BaseButton size="sm" type="button" variant="ghost" :disabled="actionPending === `${match.id}:rejected`" @click="updateMatch(match, 'rejected')">
                      Rejeter
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="grid gap-4">
        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-primary">Liaison</p>
              <h2 class="mt-1 text-lg font-semibold text-coursia-text">Associer une offre</h2>
            </div>
            <BaseBadge :tone="form.unitComparison.comparable ? 'success' : 'warning'">
              {{ form.unitComparison.comparable ? 'Comparable' : 'À vérifier' }}
            </BaseBadge>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="saveMatch">
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Ingrédient
              <select v-model="form.ingredientId" required>
                <option value="" disabled>Choisir un ingrédient</option>
                <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
                  {{ ingredient.name }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Offre magasin
              <select v-model="selectedOfferKey" required>
                <option value="" disabled>Choisir une offre</option>
                <option
                  v-for="offer in offerOptions"
                  :key="`${offer.product_id}:${offer.retailer_id}`"
                  :value="`${offer.product_id}:${offer.retailer_id}`"
                >
                  {{ offer.product_name }} · {{ offer.retailer_name }} · {{ offer.format }}
                </option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Enseigne
              <select v-model="form.retailerId" required>
                <option value="" disabled>Choisir une enseigne</option>
                <option v-for="retailer in retailers" :key="retailer.id" :value="retailer.id">
                  {{ retailer.name }}
                </option>
              </select>
            </label>

            <div class="grid grid-cols-[1fr_1fr] gap-2">
              <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
                Unité ingrédient
                <select v-model="form.unitComparison.ingredientUnit" @change="refreshUnitComparison">
                  <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
                </select>
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
                Unité produit
                <select v-model="form.unitComparison.productUnit" @change="refreshUnitComparison">
                  <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
                </select>
              </label>
            </div>

            <div class="grid grid-cols-[0.8fr_1fr] gap-2">
              <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
                Confiance
                <input v-model.number="form.confidence" required type="number" min="0" max="1" step="0.01" />
              </label>
              <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
                Statut
                <select v-model="form.status">
                  <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                    {{ status.label }}
                  </option>
                </select>
              </label>
            </div>

            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Notes
              <textarea v-model="form.notes" rows="3" placeholder="Pourquoi ce lien est validé ou ambigu ?" />
            </label>

            <div v-if="selectedOffer || selectedIngredient" class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-semibold text-coursia-text">
                {{ selectedIngredient?.name || 'Ingrédient' }} → {{ selectedOffer?.product_name || 'offre magasin' }}
              </p>
              <p class="mt-1 text-xs text-coursia-muted">
                Prix : {{ formatPrice(selectedOffer?.latest_price_chf) }} · format :
                {{ selectedOffer?.format || 'non renseigné' }}
              </p>
            </div>

            <BaseButton type="submit" :disabled="saving || !form.ingredientId || !form.productId || !form.retailerId">
              {{ saving ? 'Enregistrement...' : 'Enregistrer la liaison' }}
            </BaseButton>
          </form>
        </section>

        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-coursia-text">Impact</h2>
              <p class="mt-1 text-xs text-coursia-muted">Recettes touchées par l’ingrédient sélectionné.</p>
            </div>
            <BaseButton type="button" size="sm" variant="secondary" @click="loadImpact()">
              Calculer
            </BaseButton>
          </div>
          <pre v-if="impact" class="mt-4 max-h-64 overflow-auto rounded-2xl bg-coursia-surface-muted p-4 text-xs text-coursia-text">{{ impact }}</pre>
          <p v-else class="mt-4 rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
            Aucun impact calculé pour le moment.
          </p>
        </section>
      </aside>
    </div>

    <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-coursia-text">Ingrédients sans produit</h2>
          <p class="mt-1 text-xs text-coursia-muted">
            Priorité de saisie pour éviter des paniers incomplets.
          </p>
        </div>
        <BaseBadge tone="warning">{{ unmatched.length }} à traiter</BaseBadge>
      </div>

      <div v-if="unmatched.length === 0" class="mt-4 rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
        Aucun ingrédient sans correspondance.
      </div>
      <div v-else class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="ingredient in unmatched"
          :key="ingredient.id"
          type="button"
          class="cursor-pointer rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4 text-left transition hover:border-coursia-primary/40 hover:bg-coursia-surface"
          @click="useUnmatchedIngredient(ingredient)"
        >
          <span class="block text-sm font-semibold text-coursia-text">{{ ingredient.name }}</span>
          <span class="mt-1 block text-xs text-coursia-muted">{{ ingredient.categories[0] || ingredient.mobile?.aisle || 'Non classé' }}</span>
        </button>
      </div>
    </section>
  </section>
</template>
