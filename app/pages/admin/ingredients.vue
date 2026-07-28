<script setup lang="ts">
import {
  allergenCodeSchema,
  dietCodeSchema,
  estimateIngredientCatalogImpact,
  findIngredientCatalogConflicts,
  type CanonicalIngredientInput,
} from '#shared/validation/ingredient-catalog'

definePageMeta({
  layout: 'admin',
})

type IngredientRecord = Record<string, unknown>
type IngredientUnit = CanonicalIngredientInput['units'][number]
type AllergenCode = CanonicalIngredientInput['allergens'][number]
type DietCode = CanonicalIngredientInput['diets'][number]

const unitOptions: IngredientUnit[] = ['g', 'kg', 'ml', 'l', 'piece', 'tbsp', 'tsp']
const allergenOptions = allergenCodeSchema.options
const dietOptions = dietCodeSchema.options

const createEmptyForm = (): CanonicalIngredientInput => ({
  name: '',
  slug: '',
  status: 'active',
  synonyms: [],
  units: ['g'],
  categories: [],
  allergens: [],
  diets: [],
  sensitive: false,
})

const form = reactive<CanonicalIngredientInput>(createEmptyForm())

const filters = reactive({
  search: '',
  allergen: '',
  diet: '',
  status: '',
})

const ingredients = ref<IngredientRecord[]>([])
const selectedIngredientId = ref<string | null>(null)
const mergeTargetId = ref('')
const feedback = ref('')
const errorMessage = ref('')
const loading = ref(false)
const saving = ref(false)
const synonymInput = ref('')
const categoryInput = ref('')

const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []

const isIngredientUnit = (value: string): value is IngredientUnit =>
  unitOptions.includes(value as IngredientUnit)

const isAllergenCode = (value: string): value is AllergenCode =>
  allergenOptions.includes(value as AllergenCode)

const isDietCode = (value: string): value is DietCode => dietOptions.includes(value as DietCode)

const impactPreview = computed(() =>
  estimateIngredientCatalogImpact(Number(ingredients.value.length), form.synonyms.length),
)

const conflictPreview = computed(() =>
  findIngredientCatalogConflicts([
    { name: form.name, slug: form.slug, synonyms: form.synonyms },
    ...ingredients.value
      .filter((item) => String(item.id) !== selectedIngredientId.value)
      .map((item) => ({
        name: String(item.name ?? ''),
        slug: String(item.slug ?? ''),
        synonyms: toStringArray(item.synonyms),
      })),
  ]),
)

const visibleIngredients = computed(() => ingredients.value)

const statusLabel = (status: unknown) => (status === 'archived' ? 'Archivé' : 'Actif')
const statusTone = (status: unknown) => (status === 'archived' ? 'neutral' : 'success')

const resetForm = () => {
  selectedIngredientId.value = null
  mergeTargetId.value = ''
  synonymInput.value = ''
  categoryInput.value = ''
  Object.assign(form, createEmptyForm())
}

const selectIngredient = (ingredient: IngredientRecord) => {
  const units = toStringArray(ingredient.units).filter(isIngredientUnit)
  selectedIngredientId.value = String(ingredient.id)
  mergeTargetId.value = ''
  Object.assign(form, {
    name: String(ingredient.name ?? ''),
    slug: String(ingredient.slug ?? ''),
    status: ingredient.status === 'archived' ? 'archived' : 'active',
    synonyms: toStringArray(ingredient.synonyms),
    units: units.length > 0 ? units : ['g'],
    categories: toStringArray(ingredient.categories),
    allergens: toStringArray(ingredient.allergens).filter(isAllergenCode),
    diets: toStringArray(ingredient.diets).filter(isDietCode),
    sensitive: Boolean(ingredient.sensitive),
  })
}

const loadIngredients = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: IngredientRecord[] }>('/api/admin/ingredients', {
      query: filters,
    })
    ingredients.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  } finally {
    loading.value = false
  }
}

const saveIngredient = async () => {
  if (conflictPreview.value.length > 0) {
    feedback.value = ''
    errorMessage.value = 'Conflit détecté : nom, slug ou synonyme déjà utilisé.'
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const endpoint = selectedIngredientId.value
      ? `/api/admin/ingredients/${selectedIngredientId.value}`
      : '/api/admin/ingredients'
    const method = selectedIngredientId.value ? 'PUT' : 'POST'

    await $fetch(endpoint, { method, body: form })
    feedback.value = selectedIngredientId.value ? 'Ingrédient modifié.' : 'Ingrédient créé.'
    resetForm()
    await loadIngredients()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

const addSynonym = () => {
  const value = synonymInput.value.trim()

  if (value && !form.synonyms.includes(value)) {
    form.synonyms.push(value)
    synonymInput.value = ''
  }
}

const removeSynonym = (synonym: string) => {
  form.synonyms = form.synonyms.filter((item) => item !== synonym)
}

const addCategory = () => {
  const value = categoryInput.value.trim()

  if (value && !form.categories.includes(value)) {
    form.categories.push(value)
    categoryInput.value = ''
  }
}

const removeCategory = (category: string) => {
  form.categories = form.categories.filter((item) => item !== category)
}

const archiveIngredient = async (id: string) => {
  await $fetch(`/api/admin/ingredients/${id}/archive`, { method: 'POST' })
  feedback.value = 'Ingrédient archivé après aperçu d’impact.'
  await loadIngredients()
}

const mergeIngredient = async (id: string) => {
  if (!mergeTargetId.value.trim()) {
    errorMessage.value = 'Ajoute un ID cible avant de fusionner.'
    return
  }

  await $fetch(`/api/admin/ingredients/${id}/merge`, {
    method: 'POST',
    body: {
      targetId: mergeTargetId.value.trim(),
      reason: 'Fusion depuis l’administration',
    },
  })
  feedback.value = 'Fusion auditée et impact affiché.'
  resetForm()
  await loadIngredients()
}

onMounted(loadIngredients)
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-98</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Référentiel ingrédients
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Gère les ingrédients canoniques, synonymes, unités, allergènes et régimes utilisés par
          les recettes, la recherche et les filtres mobiles.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="resetForm">Nouvel ingrédient</BaseButton>
        <BaseButton type="button" :disabled="loading" @click="loadIngredients">
          {{ loading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <div class="admin-toolbar mt-6 grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]">
      <input
        v-model="filters.search"
        type="search"
        placeholder="Rechercher un ingrédient ou un synonyme"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        @keyup.enter="loadIngredients"
      >
      <select
        v-model="filters.allergen"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      >
        <option value="">Tous allergènes</option>
        <option v-for="allergen in allergenOptions" :key="allergen" :value="allergen">
          {{ allergen }}
        </option>
      </select>
      <select
        v-model="filters.diet"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      >
        <option value="">Tous régimes</option>
        <option v-for="diet in dietOptions" :key="diet" :value="diet">{{ diet }}</option>
      </select>
      <select
        v-model="filters.status"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      >
        <option value="">Tous statuts</option>
        <option value="active">Actif</option>
        <option value="archived">Archivé</option>
      </select>
      <BaseButton type="button" variant="secondary" @click="loadIngredients">Filtrer</BaseButton>
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
            <h2 class="text-sm font-semibold text-[#101828]">Catalogue</h2>
            <p class="mt-1 text-xs text-[#667085]">{{ ingredients.length }} ingrédients chargés</p>
          </div>
          <BaseBadge tone="neutral">Source Supabase</BaseBadge>
        </div>

        <div v-if="loading" class="p-5 text-sm text-[#667085]">Chargement du catalogue...</div>
        <div v-else-if="visibleIngredients.length === 0" class="p-5 text-sm text-[#667085]">
          Aucun ingrédient ne correspond aux filtres.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#eee8df] text-sm">
            <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
              <tr>
                <th class="px-5 py-3">Ingrédient</th>
                <th class="px-5 py-3">Unités</th>
                <th class="px-5 py-3">Sécurité alimentaire</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eee8df]">
              <tr
                v-for="ingredient in visibleIngredients"
                :key="String(ingredient.id)"
                class="transition hover:bg-[#fbfaf7]"
              >
                <td class="px-5 py-4">
                  <button
                    type="button"
                    class="text-left"
                    @click="selectIngredient(ingredient)"
                  >
                    <span class="block font-semibold text-[#101828]">{{ ingredient.name }}</span>
                    <span class="mt-1 block text-xs text-[#667085]">{{ ingredient.slug }}</span>
                    <span v-if="toStringArray(ingredient.synonyms).length" class="mt-2 block text-xs text-[#98a2b3]">
                      {{ toStringArray(ingredient.synonyms).slice(0, 3).join(', ') }}
                    </span>
                  </button>
                </td>
                <td class="px-5 py-4 text-[#667085]">
                  {{ toStringArray(ingredient.units).join(', ') || '—' }}
                </td>
                <td class="px-5 py-4">
                  <div class="flex max-w-sm flex-wrap gap-1.5">
                    <BaseBadge
                      v-if="ingredient.sensitive"
                      tone="warning"
                    >
                      sensible
                    </BaseBadge>
                    <BaseBadge
                      v-for="allergen in toStringArray(ingredient.allergens).slice(0, 3)"
                      :key="allergen"
                      tone="danger"
                    >
                      {{ allergen }}
                    </BaseBadge>
                    <BaseBadge
                      v-for="diet in toStringArray(ingredient.diets).slice(0, 3)"
                      :key="diet"
                      tone="success"
                    >
                      {{ diet }}
                    </BaseBadge>
                    <span
                      v-if="!ingredient.sensitive && !toStringArray(ingredient.allergens).length && !toStringArray(ingredient.diets).length"
                      class="text-xs text-[#98a2b3]"
                    >
                      Non renseigné
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="statusTone(ingredient.status)">
                    {{ statusLabel(ingredient.status) }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="secondary" type="button" @click="selectIngredient(ingredient)">
                      Modifier
                    </BaseButton>
                    <BaseButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      @click="archiveIngredient(String(ingredient.id))"
                    >
                      Archiver
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]" @submit.prevent="saveIngredient">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">
              {{ selectedIngredientId ? 'Modification' : 'Création' }}
            </p>
            <h2 class="mt-2 text-lg font-semibold text-[#101828]">Fiche ingrédient</h2>
          </div>
          <BaseButton v-if="selectedIngredientId" type="button" size="sm" variant="ghost" @click="resetForm">
            Annuler
          </BaseButton>
        </div>

        <div class="mt-5 grid gap-4">
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Nom
            <input
              v-model="form.name"
              required
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
            >
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Slug
            <input
              v-model="form.slug"
              required
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
            >
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Statut
            <select
              v-model="form.status"
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
            >
              <option value="active">Actif</option>
              <option value="archived">Archivé</option>
            </select>
          </label>
        </div>

        <fieldset class="mt-5">
          <legend class="text-xs font-semibold text-[#344054]">Unités compatibles</legend>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <label
              v-for="unit in unitOptions"
              :key="unit"
              class="flex items-center gap-2 rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs text-[#667085]"
            >
              <input v-model="form.units" type="checkbox" :value="unit">
              {{ unit }}
            </label>
          </div>
        </fieldset>

        <div class="mt-5 grid gap-4">
          <div>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Synonymes
              <div class="flex gap-2">
                <input
                  v-model="synonymInput"
                  class="min-w-0 flex-1 rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
                  @keyup.enter.prevent="addSynonym"
                >
                <BaseButton type="button" size="sm" variant="secondary" @click="addSynonym">Ajouter</BaseButton>
              </div>
            </label>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="synonym in form.synonyms"
                :key="synonym"
                type="button"
                class="rounded-full bg-[#f1f5f3] px-3 py-1 text-xs text-[#344054]"
                @click="removeSynonym(synonym)"
              >
                {{ synonym }} ×
              </button>
            </div>
          </div>

          <div>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Catégories
              <div class="flex gap-2">
                <input
                  v-model="categoryInput"
                  class="min-w-0 flex-1 rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
                  @keyup.enter.prevent="addCategory"
                >
                <BaseButton type="button" size="sm" variant="secondary" @click="addCategory">Ajouter</BaseButton>
              </div>
            </label>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="category in form.categories"
                :key="category"
                type="button"
                class="rounded-full bg-[#fff2e8] px-3 py-1 text-xs text-[#7a4b2b]"
                @click="removeCategory(category)"
              >
                {{ category }} ×
              </button>
            </div>
          </div>
        </div>

        <fieldset class="mt-5">
          <legend class="text-xs font-semibold text-[#344054]">Allergènes</legend>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <label
              v-for="allergen in allergenOptions"
              :key="allergen"
              class="flex items-center gap-2 rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs text-[#667085]"
            >
              <input v-model="form.allergens" type="checkbox" :value="allergen">
              {{ allergen }}
            </label>
          </div>
        </fieldset>

        <fieldset class="mt-5">
          <legend class="text-xs font-semibold text-[#344054]">Régimes</legend>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <label
              v-for="diet in dietOptions"
              :key="diet"
              class="flex items-center gap-2 rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs text-[#667085]"
            >
              <input v-model="form.diets" type="checkbox" :value="diet">
              {{ diet }}
            </label>
          </div>
        </fieldset>

        <label class="mt-5 flex items-center gap-3 rounded-xl border border-[#e6e1d8] px-3 py-2.5 text-sm text-[#344054]">
          <input v-model="form.sensitive" type="checkbox">
          Donnée sensible pour la sécurité alimentaire
        </label>

        <div class="mt-5 rounded-2xl bg-[#fbfaf7] p-4 text-xs text-[#667085]">
          Impact estimé : {{ impactPreview.affectedRecipes }} recettes,
          {{ impactPreview.affectedSynonyms }} synonymes.
          Revue requise : {{ impactPreview.requiresReview ? 'oui' : 'non' }}.
        </div>

        <div v-if="selectedIngredientId" class="mt-5 rounded-2xl border border-[#e6e1d8] p-4">
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Fusionner vers l’ID cible
            <input
              v-model="mergeTargetId"
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
            >
          </label>
          <BaseButton
            class="mt-3"
            type="button"
            size="sm"
            variant="secondary"
            @click="mergeIngredient(selectedIngredientId)"
          >
            Fusionner
          </BaseButton>
        </div>

        <div v-if="conflictPreview.length > 0" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-xs text-coursia-danger">
          {{ conflictPreview.length }} conflit(s) détecté(s). Corrige le nom, le slug ou les synonymes avant d’enregistrer.
        </div>

        <BaseButton class="mt-5 w-full" type="submit" :disabled="saving">
          {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
        </BaseButton>
      </form>
    </div>
  </section>
</template>
