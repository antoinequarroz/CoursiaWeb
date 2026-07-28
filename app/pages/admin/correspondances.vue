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
type MatchRecord = Record<string, unknown>
type ProductUnit = IngredientProductMatchInput['unitComparison']['ingredientUnit']
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const statusOptions: Array<{ value: MatchStatus; label: string }> = [
  { value: 'suggested', label: 'Suggestion' },
  { value: 'confirmed', label: 'Confirmée' },
  { value: 'ambiguous', label: 'Ambiguë' },
  { value: 'rejected', label: 'Rejetée' },
]

const unitOptions: ProductUnit[] = ['g', 'kg', 'ml', 'l', 'piece', 'pack']

const form = reactive<IngredientProductMatchInput>({
  ingredientId: '00000000-0000-4000-8000-000000000001',
  productId: '00000000-0000-4000-8000-000000000001',
  retailerId: '00000000-0000-4000-8000-000000000001',
  confidence: 0.85,
  status: 'suggested',
  source: 'manual',
  unitComparison: buildUnitComparison('g', 'g'),
  notes: '',
})

const filters = reactive({
  ingredientId: '',
  retailerId: '',
  status: '',
})

const matches = ref<MatchRecord[]>([])
const unmatched = ref<MatchRecord[]>([])
const impact = ref<Record<string, unknown> | null>(null)
const feedback = ref('')
const errorMessage = ref('')
const loading = ref(false)
const saving = ref(false)

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

const setUnitComparison = () => {
  form.unitComparison = buildUnitComparison(
    form.unitComparison.ingredientUnit,
    form.unitComparison.productUnit,
  )
}

const ambiguousPreview = computed(() =>
  findAmbiguousMatches(
    matches.value.map((match) => ({
      status: String(match.status) as MatchStatus,
      confidence: Number(match.confidence ?? 0),
    })),
  ),
)

const loadMatches = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: MatchRecord[] }>('/api/admin/matching', {
      query: filters,
    })
    matches.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

const loadUnmatched = async () => {
  const response = await $fetch<{ data: MatchRecord[] }>('/api/admin/matching/unmatched')
  unmatched.value = response.data
}

const saveMatch = async () => {
  saving.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/admin/matching', { method: 'POST', body: form })
    feedback.value = 'Correspondance créée. Elle reste confirmable manuellement.'
    await Promise.all([loadMatches(), loadUnmatched()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

const updateMatch = async (id: string, status: 'confirmed' | 'ambiguous' | 'rejected') => {
  await $fetch(`/api/admin/matching/${id}`, {
    method: 'PUT',
    body: {
      status,
      notes: status === 'confirmed' ? 'Confirmation manuelle' : 'Cas à vérifier',
    },
  })
  feedback.value =
    status === 'confirmed'
      ? 'Correspondance confirmée manuellement.'
      : 'Cas marqué pour revue, sans validation silencieuse.'
  await Promise.all([loadMatches(), loadUnmatched()])
}

const loadImpact = async (ingredientId?: unknown) => {
  const selectedIngredientId = String(ingredientId || filters.ingredientId || form.ingredientId).trim()

  if (!selectedIngredientId) {
    errorMessage.value = 'Indique un ingrédient avant de calculer l’impact.'
    return
  }

  const response = await $fetch<{ data: Record<string, unknown> }>('/api/admin/matching/impact', {
    query: { ingredientId: selectedIngredientId },
  })
  impact.value = response.data
}

const useUnmatchedIngredient = (ingredient: MatchRecord) => {
  form.ingredientId = String(ingredient.id ?? form.ingredientId)
  filters.ingredientId = form.ingredientId
}

onMounted(() => {
  void Promise.all([loadMatches(), loadUnmatched()])
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-103</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Correspondances ingrédients-produits
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Relie les ingrédients des recettes aux produits comparables par enseigne. Les cas ambigus
          restent visibles avant d’alimenter les paniers et le comparateur mobile.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="loadUnmatched">
          Voir les ingrédients sans produit
        </BaseButton>
        <BaseButton type="button" :disabled="loading" @click="loadMatches">
          {{ loading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Correspondances</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ matches.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">chargées depuis Supabase</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">À traiter</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ unmatched.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">ingrédients sans correspondance</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Ambigus</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ ambiguousPreview.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">faible confiance ou statut ambigu</p>
      </article>
    </div>

    <div class="admin-toolbar mt-6 grid gap-3 md:grid-cols-[1fr_1fr_0.8fr_auto]">
      <input
        v-model="filters.ingredientId"
        placeholder="ID ingrédient"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        @keyup.enter="loadMatches"
      >
      <input
        v-model="filters.retailerId"
        placeholder="ID enseigne"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        @keyup.enter="loadMatches"
      >
      <select
        v-model="filters.status"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      >
        <option value="">Tous statuts</option>
        <option v-for="status in statusOptions" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
      <BaseButton type="button" variant="secondary" @click="loadMatches">Filtrer</BaseButton>
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section class="admin-table overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
        <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#101828]">Correspondances actives</h2>
            <p class="mt-1 text-xs text-[#667085]">
              Confirme, rejette ou marque ambigu avant utilisation dans les paniers.
            </p>
          </div>
          <BaseBadge tone="neutral">Qualité prix</BaseBadge>
        </div>

        <div v-if="loading" class="p-5 text-sm text-[#667085]">Chargement des correspondances...</div>
        <div v-else-if="matches.length === 0" class="p-5 text-sm text-[#667085]">
          Aucune correspondance ne correspond aux filtres.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#eee8df] text-sm">
            <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
              <tr>
                <th class="px-5 py-3">Ingrédient</th>
                <th class="px-5 py-3">Produit</th>
                <th class="px-5 py-3">Enseigne</th>
                <th class="px-5 py-3">Confiance</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eee8df]">
              <tr v-for="match in matches" :key="String(match.id)" class="transition hover:bg-[#fbfaf7]">
                <td class="px-5 py-4">
                  <span class="block font-semibold text-[#101828]">{{ match.ingredient_name || match.ingredient_id }}</span>
                  <span class="mt-1 block text-xs text-[#667085]">{{ match.ingredient_id }}</span>
                </td>
                <td class="px-5 py-4">
                  <span class="block font-medium text-[#101828]">{{ match.product_name || match.product_id }}</span>
                  <span class="mt-1 block text-xs text-[#667085]">source {{ match.source || '—' }}</span>
                </td>
                <td class="px-5 py-4 text-[#667085]">{{ match.retailer_name || match.retailer_id }}</td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="confidenceTone(match.confidence)">
                    {{ Math.round(Number(match.confidence ?? 0) * 100) }} %
                  </BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="statusTone(match.status)">
                    {{ statusLabel(match.status) }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" type="button" @click="updateMatch(String(match.id), 'confirmed')">
                      Confirmer
                    </BaseButton>
                    <BaseButton size="sm" type="button" variant="secondary" @click="updateMatch(String(match.id), 'ambiguous')">
                      Ambigu
                    </BaseButton>
                    <BaseButton size="sm" type="button" variant="ghost" @click="updateMatch(String(match.id), 'rejected')">
                      Rejeter
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="grid gap-5">
        <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]" @submit.prevent="saveMatch">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Nouvelle liaison</p>
          <h2 class="mt-2 text-lg font-semibold text-[#101828]">Associer un produit magasin</h2>

          <div class="mt-5 grid gap-4">
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              ID ingrédient
              <input
                v-model="form.ingredientId"
                required
                class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
              >
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              ID produit
              <input
                v-model="form.productId"
                required
                class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
              >
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              ID enseigne
              <input
                v-model="form.retailerId"
                required
                class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
              >
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Confiance
              <input
                v-model.number="form.confidence"
                required
                type="number"
                min="0"
                max="1"
                step="0.01"
                class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
              >
            </label>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-3">
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Unité ingrédient
              <select
                v-model="form.unitComparison.ingredientUnit"
                class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
                @change="setUnitComparison"
              >
                <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Unité produit
              <select
                v-model="form.unitComparison.productUnit"
                class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
                @change="setUnitComparison"
              >
                <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </label>
          </div>

          <label class="mt-4 grid gap-1.5 text-xs font-semibold text-[#344054]">
            Statut
            <select
              v-model="form.status"
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
            >
              <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </label>

          <label class="mt-4 grid gap-1.5 text-xs font-semibold text-[#344054]">
            Notes de revue
            <textarea
              v-model="form.notes"
              rows="3"
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
            />
          </label>

          <div class="mt-4 rounded-2xl bg-[#fbfaf7] p-4 text-xs text-[#667085]">
            Unités comparables : {{ form.unitComparison.comparable ? 'oui' : 'non' }}.
            <span v-if="form.unitComparison.conversionFactor">
              Conversion : × {{ form.unitComparison.conversionFactor }}.
            </span>
          </div>

          <BaseButton class="mt-5 w-full" type="submit" :disabled="saving">
            {{ saving ? 'Enregistrement...' : 'Enregistrer la liaison' }}
          </BaseButton>
        </form>

        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold text-[#101828]">Impact recettes/paniers</h2>
              <p class="mt-1 text-xs text-[#667085]">À contrôler avant une correction globale.</p>
            </div>
            <BaseButton type="button" size="sm" variant="secondary" @click="loadImpact()">
              Calculer
            </BaseButton>
          </div>
          <pre v-if="impact" class="mt-4 max-h-64 overflow-auto rounded-2xl bg-[#fbfaf7] p-4 text-xs text-[#344054]">{{ impact }}</pre>
          <p v-else class="mt-4 text-sm text-[#667085]">Aucun impact calculé pour le moment.</p>
        </article>
      </aside>
    </div>

    <section class="mt-6 rounded-2xl border border-[#e6e1d8] bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Ingrédients sans correspondance</h2>
          <p class="mt-1 text-xs text-[#667085]">
            Priorise ces éléments pour éviter des paniers incomplets dans l’application.
          </p>
        </div>
        <BaseBadge tone="warning">{{ unmatched.length }} à traiter</BaseBadge>
      </div>

      <div v-if="unmatched.length === 0" class="mt-4 rounded-2xl bg-[#fbfaf7] p-4 text-sm text-[#667085]">
        Aucun ingrédient sans correspondance.
      </div>
      <div v-else class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="ingredient in unmatched"
          :key="String(ingredient.id)"
          type="button"
          class="rounded-2xl border border-[#e6e1d8] bg-[#fbfaf7] p-4 text-left transition hover:border-coursia-primary/40 hover:bg-white"
          @click="useUnmatchedIngredient(ingredient)"
        >
          <span class="block text-sm font-semibold text-[#101828]">{{ ingredient.name }}</span>
          <span class="mt-1 block text-xs text-[#667085]">{{ ingredient.slug || ingredient.id }}</span>
        </button>
      </div>
    </section>
  </section>
</template>
