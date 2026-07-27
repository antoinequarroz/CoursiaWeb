<script setup lang="ts">
import type { OfficialRecipeMutation } from '#shared/validation/course'
import {
  canonicalIngredients,
  findDuplicateRecipeIngredients,
  findIncompatibleIngredientUnits,
  scaleRecipeQuantity,
} from '#shared/validation/course'

definePageMeta({
  layout: 'admin',
})

type AdminRecipeRow = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'review' | 'published' | 'archived'
  portions: number | null
  duration_minutes: number | null
  difficulty: 'easy' | 'medium' | 'hard' | null
  ingredients: OfficialRecipeMutation['ingredients']
  steps: OfficialRecipeMutation['steps']
  nutrition: OfficialRecipeMutation['nutrition']
  categories: string[]
  source: string | null
  updated_at: string | null
  mobile?: {
    estimatedCost?: number | null
    publicationStatus?: string | null
  }
}

const route = useRoute()

const filters = reactive({
  search: '',
  status: typeof route.query.status === 'string' ? route.query.status : '',
  difficulty: '',
  category: '',
})

const createEmptyForm = (): OfficialRecipeMutation => ({
  title: '',
  slug: '',
  status: 'draft',
  portions: undefined,
  durationMinutes: undefined,
  difficulty: undefined,
  categories: [],
  source: '',
  ingredients: [],
  steps: [],
  nutrition: {},
})

const form = reactive<OfficialRecipeMutation>(createEmptyForm())
const selectedRecipeId = ref<string | null>(null)
const feedback = ref('')
const loading = ref(false)
const saving = ref(false)
const recipes = ref<AdminRecipeRow[]>([])
const recipePage = ref(1)
const recipePageSize = 25
const targetPortions = ref(4)

const visibleRecipes = computed(() =>
  recipes.value.slice(0, recipePage.value * recipePageSize),
)

const hasMoreRecipes = computed(() => recipes.value.length > visibleRecipes.value.length)

const recipeStats = computed(() => {
  const totals = {
    all: recipes.value.length,
    published: 0,
    draft: 0,
    review: 0,
    archived: 0,
  }

  for (const recipe of recipes.value) {
    totals[recipe.status] += 1
  }

  return totals
})

const selectedRecipe = computed(() =>
  selectedRecipeId.value
    ? recipes.value.find((recipe) => recipe.id === selectedRecipeId.value) ?? null
    : null,
)

const formErrors = computed(() => {
  const duplicateIds = findDuplicateRecipeIngredients(form.ingredients)
  const incompatible = findIncompatibleIngredientUnits(form.ingredients)

  return {
    duplicateIds,
    incompatible,
    hasErrors: duplicateIds.length > 0 || incompatible.length > 0,
  }
})

const portionPreview = computed(() => {
  const fromPortions = form.portions ?? targetPortions.value

  return form.ingredients.map((ingredient) => ({
    ...ingredient,
    scaledQuantity: scaleRecipeQuantity(ingredient.quantity, fromPortions, targetPortions.value),
  }))
})

const statusLabel = (status: AdminRecipeRow['status'] | OfficialRecipeMutation['status']) => {
  const labels = {
    draft: 'Brouillon',
    review: 'En validation',
    published: 'Publiée',
    archived: 'Archivée',
  } as const

  return labels[status]
}

const statusTone = (status: AdminRecipeRow['status'] | OfficialRecipeMutation['status']) => {
  const tones = {
    draft: 'neutral',
    review: 'warning',
    published: 'success',
    archived: 'danger',
  } as const

  return tones[status]
}

const difficultyLabel = (difficulty: AdminRecipeRow['difficulty'] | OfficialRecipeMutation['difficulty']) => {
  if (!difficulty) return 'À compléter'

  const labels = {
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
  } as const

  return labels[difficulty]
}

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Jamais'

const formatCurrency = (value: number | null | undefined) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('fr-CH', {
        style: 'currency',
        currency: 'CHF',
        maximumFractionDigits: 2,
      }).format(value)

const resetForm = () => {
  Object.assign(form, createEmptyForm())
  selectedRecipeId.value = null
  targetPortions.value = 4
}

const selectRecipe = (recipe: AdminRecipeRow) => {
  selectedRecipeId.value = recipe.id
  Object.assign(form, {
    title: recipe.title,
    slug: recipe.slug,
    status: recipe.status,
    portions: recipe.portions ?? undefined,
    durationMinutes: recipe.duration_minutes ?? undefined,
    difficulty: recipe.difficulty ?? undefined,
    categories: recipe.categories ?? [],
    source: recipe.source ?? '',
    ingredients: recipe.ingredients?.length ? structuredClone(recipe.ingredients) : [],
    steps: recipe.steps?.length ? structuredClone(recipe.steps) : [],
    nutrition: recipe.nutrition ?? {},
  })
  targetPortions.value = recipe.portions ?? 4
  feedback.value = `Recette sélectionnée : ${recipe.title}`
}

const loadRecipes = async () => {
  loading.value = true
  feedback.value = ''

  try {
    const response = await $fetch<{ data: AdminRecipeRow[] }>('/api/admin/recipes', {
      query: {
        search: filters.search || undefined,
        status: filters.status || undefined,
        difficulty: filters.difficulty || undefined,
        category: filters.category || undefined,
        limit: 100,
      },
    })
    recipes.value = response.data
    recipePage.value = 1
  } catch {
    feedback.value = 'Erreur de chargement des recettes officielles.'
  } finally {
    loading.value = false
  }
}

const saveRecipe = async () => {
  if (formErrors.value.hasErrors) {
    feedback.value = 'Corrige les doublons ou unités incompatibles avant d’enregistrer.'
    return
  }

  saving.value = true

  try {
    const endpoint = selectedRecipeId.value
      ? `/api/admin/recipes/${selectedRecipeId.value}`
      : '/api/admin/recipes'
    const method = selectedRecipeId.value ? 'PUT' : 'POST'

    await $fetch(endpoint, {
      method,
      body: form,
    })
    feedback.value = selectedRecipeId.value ? 'Recette mise à jour.' : 'Recette créée.'
    await loadRecipes()
  } catch {
    feedback.value = 'Impossible d’enregistrer la recette.'
  } finally {
    saving.value = false
  }
}

const addIngredient = () => {
  const ingredient = canonicalIngredients[0]

  form.ingredients.push({
    ingredientId: ingredient.id,
    name: ingredient.name,
    quantity: 1,
    unit: ingredient.compatibleUnits[0],
    group: 'Principal',
    optional: false,
  })
}

const removeIngredient = (index: number) => {
  form.ingredients.splice(index, 1)
}

const addStep = () => {
  form.steps.push({
    order: form.steps.length + 1,
    instruction: '',
  })
}

const moveStep = (index: number, direction: -1 | 1) => {
  const targetIndex = index + direction

  if (targetIndex < 0 || targetIndex >= form.steps.length) return

  const [step] = form.steps.splice(index, 1)
  if (step) form.steps.splice(targetIndex, 0, step)

  form.steps.forEach((item, itemIndex) => {
    item.order = itemIndex + 1
  })
}

const removeStep = (index: number) => {
  form.steps.splice(index, 1)
  form.steps.forEach((item, itemIndex) => {
    item.order = itemIndex + 1
  })
}

const duplicateRecipe = async (id: string) => {
  await $fetch(`/api/admin/recipes/${id}/duplicate`, { method: 'POST' })
  feedback.value = 'Recette dupliquée en brouillon.'
  await loadRecipes()
}

const archiveRecipe = async (id: string) => {
  await $fetch(`/api/admin/recipes/${id}/archive`, { method: 'POST' })
  feedback.value = 'Recette archivée.'
  await loadRecipes()
}

const deleteRecipe = async (id: string) => {
  await $fetch(`/api/admin/recipes/${id}`, { method: 'DELETE' })
  feedback.value = 'Suppression définitive effectuée.'
  await loadRecipes()
}

onMounted(() => {
  void loadRecipes()
})
</script>

<template>
  <section class="grid gap-6">
    <div class="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.18em] text-[#1f6b4a]">
          Catalogue officiel
        </p>
        <h1 class="mt-2 text-3xl font-black tracking-tight text-[#101828] md:text-4xl">
          Recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Gestion du catalogue consommé par l’application mobile : brouillons, publication,
          duplication, archivage, ingrédients structurés et étapes.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadRecipes">
          Rafraîchir
        </BaseButton>
        <BaseButton type="button" @click="resetForm">
          Nouvelle recette
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <button
        type="button"
        class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgb(16_24_40_/_8%)]"
        @click="filters.status = ''; loadRecipes()"
      >
        <p class="text-sm font-bold text-[#667085]">Total</p>
        <p class="mt-2 text-3xl font-black text-[#101828]">{{ recipeStats.all }}</p>
      </button>
      <button
        type="button"
        class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgb(16_24_40_/_8%)]"
        @click="filters.status = 'published'; loadRecipes()"
      >
        <p class="text-sm font-bold text-[#667085]">Publiées</p>
        <p class="mt-2 text-3xl font-black text-[#1f6b4a]">{{ recipeStats.published }}</p>
      </button>
      <button
        type="button"
        class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgb(16_24_40_/_8%)]"
        @click="filters.status = 'draft'; loadRecipes()"
      >
        <p class="text-sm font-bold text-[#667085]">Brouillons</p>
        <p class="mt-2 text-3xl font-black text-[#b85f16]">{{ recipeStats.draft }}</p>
      </button>
      <button
        type="button"
        class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgb(16_24_40_/_8%)]"
        @click="filters.status = 'review'; loadRecipes()"
      >
        <p class="text-sm font-bold text-[#667085]">En validation</p>
        <p class="mt-2 text-3xl font-black text-[#d88400]">{{ recipeStats.review }}</p>
      </button>
    </div>

    <form
      class="grid gap-3 rounded-[1.35rem] border border-[#e6e1d8] bg-white p-4 shadow-sm md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"
      @submit.prevent="loadRecipes"
    >
      <label class="grid gap-2 text-sm font-bold text-[#344054]">
        Recherche
        <input
          v-model="filters.search"
          type="search"
          placeholder="Nom, slug, ingrédient..."
          class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
        />
      </label>
      <label class="grid gap-2 text-sm font-bold text-[#344054]">
        Statut
        <select
          v-model="filters.status"
          class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
        >
          <option value="">Tous</option>
          <option value="draft">Brouillon</option>
          <option value="review">En validation</option>
          <option value="published">Publié</option>
          <option value="archived">Archivé</option>
        </select>
      </label>
      <label class="grid gap-2 text-sm font-bold text-[#344054]">
        Difficulté
        <select
          v-model="filters.difficulty"
          class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
        >
          <option value="">Toutes</option>
          <option value="easy">Facile</option>
          <option value="medium">Moyen</option>
          <option value="hard">Difficile</option>
        </select>
      </label>
      <div class="flex items-end">
        <BaseButton type="submit" class="h-12 w-full" :disabled="loading">
          Appliquer
        </BaseButton>
      </div>
    </form>

    <p
      v-if="feedback"
      class="rounded-2xl border border-[#e6e1d8] bg-white p-4 text-sm font-semibold text-[#344054] shadow-sm"
    >
      {{ feedback }}
    </p>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-black text-[#101828]">Catalogue</h2>
            <p class="mt-1 text-sm text-[#667085]">
              {{ visibleRecipes.length }} recette(s) affichée(s) sur {{ recipes.length }}.
            </p>
          </div>
          <NuxtLink
            to="/admin/recettes/import"
            class="rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs font-bold text-[#344054] transition hover:bg-[#fbf7f0]"
          >
            Import CSV
          </NuxtLink>
        </div>

        <div v-if="loading" class="mt-5 rounded-2xl bg-[#fbf7f0] p-4 text-sm text-[#667085]">
          Chargement des recettes...
        </div>
        <div v-else-if="recipes.length === 0" class="mt-5 rounded-2xl bg-[#fbf7f0] p-4 text-sm text-[#667085]">
          Aucune recette ne correspond aux filtres.
        </div>

        <div v-else class="mt-5 grid gap-3">
          <article
            v-for="recipe in visibleRecipes"
            :key="recipe.id"
            class="group rounded-2xl border border-[#eee7dc] bg-[#fbf7f0] p-4 transition hover:border-[#cfded2] hover:bg-white hover:shadow-[0_18px_42px_rgb(16_24_40_/_8%)]"
            :class="selectedRecipeId === recipe.id ? 'border-[#1f6b4a] bg-white ring-2 ring-[#1f6b4a]/10' : ''"
          >
            <div class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
              <button type="button" class="min-w-0 text-left" @click="selectRecipe(recipe)">
                <div class="flex flex-wrap items-center gap-2">
                  <BaseBadge :tone="statusTone(recipe.status)">
                    {{ statusLabel(recipe.status) }}
                  </BaseBadge>
                  <span class="text-xs font-bold uppercase tracking-[0.14em] text-[#98a2b3]">
                    {{ difficultyLabel(recipe.difficulty) }}
                  </span>
                </div>
                <h3 class="mt-3 text-lg font-black text-[#101828] group-hover:text-[#1f6b4a]">
                  {{ recipe.title || 'Recette sans titre' }}
                </h3>
                <p class="mt-2 text-sm text-[#667085]">
                  {{ recipe.slug }} · {{ recipe.portions ?? '—' }} portions ·
                  {{ recipe.duration_minutes ?? '—' }} min · MAJ {{ formatDate(recipe.updated_at) }}
                </p>
              </button>

              <div class="flex flex-wrap justify-start gap-2 lg:justify-end">
                <BaseButton size="sm" variant="secondary" type="button" @click="selectRecipe(recipe)">
                  Modifier
                </BaseButton>
                <BaseButton size="sm" variant="secondary" type="button" @click="duplicateRecipe(recipe.id)">
                  Dupliquer
                </BaseButton>
                <BaseButton size="sm" variant="ghost" type="button" @click="archiveRecipe(recipe.id)">
                  Archiver
                </BaseButton>
              </div>
            </div>

            <div class="mt-4 grid gap-3 border-t border-[#eee7dc] pt-4 text-sm sm:grid-cols-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-[#98a2b3]">Coût estimé</p>
                <p class="mt-1 font-black text-[#101828]">{{ formatCurrency(recipe.mobile?.estimatedCost) }}</p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-[#98a2b3]">Source</p>
                <p class="mt-1 truncate font-semibold text-[#344054]">{{ recipe.source || 'Non renseignée' }}</p>
              </div>
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-[#98a2b3]">Mobile</p>
                <p class="mt-1 font-semibold text-[#344054]">{{ recipe.mobile?.publicationStatus ?? '—' }}</p>
              </div>
            </div>
          </article>

          <BaseButton
            v-if="hasMoreRecipes"
            type="button"
            variant="secondary"
            @click="recipePage += 1"
          >
            Afficher plus
          </BaseButton>
        </div>
      </section>

      <aside class="grid gap-5">
        <form class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm" @submit.prevent="saveRecipe">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-black text-[#101828]">
                {{ selectedRecipe ? 'Modifier la recette' : 'Nouvelle recette' }}
              </h2>
              <p class="mt-1 text-sm text-[#667085]">
                Brouillon possible, publication uniquement avec les champs complets.
              </p>
            </div>
            <BaseBadge :tone="statusTone(form.status)">
              {{ statusLabel(form.status) }}
            </BaseBadge>
          </div>

          <div class="mt-5 grid gap-4">
            <label class="grid gap-2 text-sm font-bold text-[#344054]">
              Titre
              <input
                v-model="form.title"
                required
                class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
              />
            </label>
            <label class="grid gap-2 text-sm font-bold text-[#344054]">
              Slug
              <input
                v-model="form.slug"
                required
                class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
              />
            </label>
            <div class="grid gap-3 sm:grid-cols-3">
              <label class="grid gap-2 text-sm font-bold text-[#344054]">
                Portions
                <input
                  v-model.number="form.portions"
                  type="number"
                  min="1"
                  max="24"
                  class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
                />
              </label>
              <label class="grid gap-2 text-sm font-bold text-[#344054]">
                Durée
                <input
                  v-model.number="form.durationMinutes"
                  type="number"
                  min="1"
                  max="1440"
                  class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
                />
              </label>
              <label class="grid gap-2 text-sm font-bold text-[#344054]">
                Difficulté
                <select
                  v-model="form.difficulty"
                  class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-3 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
                >
                  <option :value="undefined">À compléter</option>
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                </select>
              </label>
            </div>
            <label class="grid gap-2 text-sm font-bold text-[#344054]">
              Statut
              <select
                v-model="form.status"
                class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
              >
                <option value="draft">Brouillon</option>
                <option value="review">En validation</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </label>
            <label class="grid gap-2 text-sm font-bold text-[#344054]">
              Source
              <input
                v-model="form.source"
                class="h-12 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] px-4 text-sm outline-none transition focus:border-[#1f6b4a] focus:bg-white"
              />
            </label>
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <BaseButton type="button" variant="secondary" @click="resetForm">
              Réinitialiser
            </BaseButton>
            <BaseButton type="submit" :disabled="saving">
              {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
            </BaseButton>
          </div>

          <button
            v-if="selectedRecipeId"
            type="button"
            class="mt-3 text-sm font-bold text-[#ff5b45] hover:underline"
            @click="deleteRecipe(selectedRecipeId)"
          >
            Supprimer définitivement
          </button>
        </form>

        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-[#101828]">Ingrédients</h2>
              <p class="mt-1 text-sm text-[#667085]">{{ form.ingredients.length }} ingrédient(s)</p>
            </div>
            <BaseButton type="button" size="sm" variant="secondary" @click="addIngredient">
              Ajouter
            </BaseButton>
          </div>

          <div class="mt-4 grid gap-3">
            <div
              v-for="(ingredient, index) in form.ingredients"
              :key="`${ingredient.ingredientId}-${index}`"
              class="rounded-2xl border border-[#eee7dc] bg-[#fbf7f0] p-3"
            >
              <label class="grid gap-2 text-sm font-bold text-[#344054]">
                Ingrédient canonique
                <select
                  v-model="ingredient.ingredientId"
                  class="h-11 rounded-xl border border-[#e6e1d8] bg-white px-3 text-sm"
                >
                  <option v-for="item in canonicalIngredients" :key="item.id" :value="item.id">
                    {{ item.name }}
                  </option>
                </select>
              </label>
              <div class="mt-3 grid gap-2 sm:grid-cols-3">
                <input v-model.number="ingredient.quantity" type="number" min="0.01" step="0.01" class="h-10 rounded-xl border border-[#e6e1d8] bg-white px-3 text-sm" />
                <select v-model="ingredient.unit" class="h-10 rounded-xl border border-[#e6e1d8] bg-white px-3 text-sm">
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="piece">pièce</option>
                  <option value="tbsp">c. soupe</option>
                  <option value="tsp">c. café</option>
                </select>
                <input v-model="ingredient.group" class="h-10 rounded-xl border border-[#e6e1d8] bg-white px-3 text-sm" />
              </div>
              <div class="mt-3 flex items-center justify-between">
                <label class="flex items-center gap-2 text-sm font-bold text-[#667085]">
                  <input v-model="ingredient.optional" type="checkbox" />
                  Optionnel
                </label>
                <button type="button" class="text-sm font-bold text-[#ff5b45]" @click="removeIngredient(index)">
                  Supprimer
                </button>
              </div>
            </div>
          </div>

          <div v-if="formErrors.hasErrors" class="mt-4 rounded-2xl bg-[#ffe9e4] p-4 text-sm font-semibold text-[#ff5b45]">
            Doublons ou unités incompatibles détectés.
          </div>
        </section>

        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="font-black text-[#101828]">Étapes</h2>
              <p class="mt-1 text-sm text-[#667085]">{{ form.steps.length }} étape(s)</p>
            </div>
            <BaseButton type="button" size="sm" variant="secondary" @click="addStep">
              Ajouter
            </BaseButton>
          </div>
          <div class="mt-4 grid gap-3">
            <div v-for="(step, index) in form.steps" :key="index" class="rounded-2xl border border-[#eee7dc] bg-[#fbf7f0] p-3">
              <label class="grid gap-2 text-sm font-bold text-[#344054]">
                Étape {{ index + 1 }}
                <textarea v-model="step.instruction" rows="3" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2 text-sm" />
              </label>
              <div class="mt-3 flex flex-wrap gap-2">
                <BaseButton type="button" size="sm" variant="secondary" @click="moveStep(index, -1)">Monter</BaseButton>
                <BaseButton type="button" size="sm" variant="secondary" @click="moveStep(index, 1)">Descendre</BaseButton>
                <BaseButton type="button" size="sm" variant="ghost" @click="removeStep(index)">Supprimer</BaseButton>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[1.35rem] border border-[#e6e1d8] bg-white p-5 shadow-sm">
          <h2 class="font-black text-[#101828]">Aperçu portions</h2>
          <label class="mt-3 grid gap-2 text-sm font-bold text-[#344054]">
            Portions cible
            <input
              v-model.number="targetPortions"
              type="number"
              min="1"
              max="24"
              class="h-11 rounded-xl border border-[#e6e1d8] bg-[#fbf7f0] px-3 text-sm"
            />
          </label>
          <ul class="mt-4 grid gap-2 text-sm text-[#667085]">
            <li
              v-for="ingredient in portionPreview"
              :key="`${ingredient.ingredientId}-preview`"
              class="flex justify-between rounded-xl bg-[#fbf7f0] px-3 py-2"
            >
              <span>{{ ingredient.name }}</span>
              <strong>{{ ingredient.scaledQuantity }} {{ ingredient.unit }}</strong>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </section>
</template>
