<script setup lang="ts">
import {
  buildUnitComparison,
  findAmbiguousMatches,
  type IngredientProductMatchInput,
} from '#shared/validation/ingredient-product-matching'

definePageMeta({
  layout: 'admin',
})

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

const matches = ref<Array<Record<string, unknown>>>([])
const unmatched = ref<Array<Record<string, unknown>>>([])
const impact = ref<Record<string, unknown> | null>(null)
const feedback = ref('')

const ambiguousPreview = computed(() =>
  findAmbiguousMatches(
    matches.value.map((match) => ({
      status: String(match.status) as 'suggested' | 'confirmed' | 'ambiguous' | 'rejected',
      confidence: Number(match.confidence ?? 0),
    })),
  ),
)

const loadMatches = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/matching', {
    query: filters,
  })
  matches.value = response.data
}

const loadUnmatched = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/matching/unmatched')
  unmatched.value = response.data
}

const saveMatch = async () => {
  await $fetch('/api/admin/matching', { method: 'POST', body: form })
  feedback.value = 'Correspondance creee. Les suggestions automatiques restent confirmables manuellement.'
  await loadMatches()
}

const updateMatch = async (id: string, status: 'confirmed' | 'ambiguous' | 'rejected') => {
  await $fetch(`/api/admin/matching/${id}`, {
    method: 'PUT',
    body: { status, notes: status === 'confirmed' ? 'Confirmation manuelle' : 'Cas a verifier' },
  })
  feedback.value = status === 'confirmed'
    ? 'Correspondance confirmee manuellement.'
    : 'Cas ambigu conserve sans validation silencieuse.'
  await loadMatches()
}

const loadImpact = async () => {
  const ingredientId = filters.ingredientId || form.ingredientId
  const response = await $fetch<{ data: Record<string, unknown> }>('/api/admin/matching/impact', {
    query: { ingredientId },
  })
  impact.value = response.data
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-103</p>
        <h1 class="mt-2 text-3xl font-black">Correspondance ingredients-produits</h1>
        <p class="mt-3 max-w-3xl text-coursia-muted">
          Relie les ingredients des recettes aux produits magasins comparables, avec confiance,
          comparaison des formats/unites, confirmation manuelle et impact recettes/paniers.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="loadUnmatched">Ingredients sans correspondance</BaseButton>
        <BaseButton type="button" @click="loadMatches">Rafraichir</BaseButton>
      </div>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-3">
      <input v-model="filters.ingredientId" placeholder="ID ingredient" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <input v-model="filters.retailerId" placeholder="ID enseigne" class="rounded-coursia-md border border-coursia-background px-4 py-3" />
      <select v-model="filters.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous statuts</option>
        <option value="suggested">Suggestion automatique</option>
        <option value="confirmed">Confirme</option>
        <option value="ambiguous">Ambigu</option>
        <option value="rejected">Rejete</option>
      </select>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <section class="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveMatch">
        <h2 class="text-2xl font-black">Associer plusieurs produits</h2>
        <p class="mt-2 text-sm text-coursia-muted">
          Plusieurs produits peuvent pointer vers le meme ingredient, chacun avec son niveau de confiance.
        </p>
        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            ID ingredient
            <input v-model="form.ingredientId" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            ID produit
            <input v-model="form.productId" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            ID enseigne
            <input v-model="form.retailerId" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Niveau de confiance
            <input v-model.number="form.confidence" required type="number" min="0" max="1" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
        </div>
        <label class="mt-5 flex items-center gap-3 text-sm font-bold">
          <input v-model="form.unitComparison.comparable" type="checkbox" />
          Formats et unites comparables
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Statut
          <select v-model="form.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
            <option value="suggested">Suggestion automatique</option>
            <option value="confirmed">Confirme manuellement</option>
            <option value="ambiguous">Ambigu</option>
            <option value="rejected">Rejete</option>
          </select>
        </label>
        <BaseButton class="mt-6" type="submit">Enregistrer la correspondance</BaseButton>
      </form>

      <section class="grid gap-5">
        <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-2xl font-black">Impact recettes et paniers</h2>
            <BaseButton type="button" size="sm" variant="secondary" @click="loadImpact">Calculer</BaseButton>
          </div>
          <p class="mt-3 text-sm text-coursia-muted">
            Une modification montre quelles recettes et paniers devront etre recalcules.
          </p>
          <pre v-if="impact" class="mt-4 overflow-auto rounded-2xl bg-coursia-background p-4 text-xs">{{ impact }}</pre>
        </article>

        <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-2xl font-black">Cas ambigus non valides silencieusement</h2>
          <p class="mt-3 text-sm text-coursia-muted">
            Ambigus detectes localement : {{ ambiguousPreview.length }}. Une confirmation demande confiance elevee et unites comparables.
          </p>
        </article>
      </section>
    </section>

    <section class="mt-8 grid gap-5 lg:grid-cols-2">
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Ingredients sans correspondance</h2>
        <div class="mt-4 grid gap-3">
          <div v-for="ingredient in unmatched" :key="String(ingredient.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
            {{ ingredient.name }} - {{ ingredient.slug }}
          </div>
        </div>
      </article>

      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Correspondances</h2>
        <div class="mt-4 grid gap-3">
          <div v-for="match in matches" :key="String(match.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
            <div class="font-bold">{{ match.ingredient_id }} -> {{ match.product_id }}</div>
            <p class="mt-1 text-coursia-muted">
              Confiance {{ match.confidence }} - {{ match.status }} - source {{ match.source }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseButton size="sm" type="button" @click="updateMatch(String(match.id), 'confirmed')">Confirmer</BaseButton>
              <BaseButton size="sm" type="button" variant="secondary" @click="updateMatch(String(match.id), 'ambiguous')">Marquer ambigu</BaseButton>
              <BaseButton size="sm" type="button" variant="ghost" @click="updateMatch(String(match.id), 'rejected')">Rejeter</BaseButton>
            </div>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
