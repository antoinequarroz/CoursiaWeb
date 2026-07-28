<script setup lang="ts">
import type { OfficialRecipeMutation } from '#shared/validation/course'

definePageMeta({
  layout: 'admin',
})

type RecipeStatus = 'draft' | 'review' | 'published' | 'archived'
type RecipeDifficulty = 'easy' | 'medium' | 'hard'

type AdminRecipeRow = {
  id: string
  title: string
  slug: string
  status: RecipeStatus
  portions: number | null
  duration_minutes: number | null
  difficulty: RecipeDifficulty | null
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

type IngredientCatalogRow = {
  id: string
  name: string
  units?: string[]
}

const route = useRoute()
const router = useRouter()

const filters = reactive({
  search: '',
  status: typeof route.query.status === 'string' ? route.query.status : '',
  difficulty: '',
})

const recipes = ref<AdminRecipeRow[]>([])
const selectedRecipe = ref<AdminRecipeRow | null>(null)
const ingredientCatalog = ref<IngredientCatalogRow[]>([])
const loading = ref(false)
const saving = ref(false)
const actionPending = ref('')
const feedback = ref('')
const editorMode = ref<'closed' | 'create' | 'edit'>('closed')
const categoryInput = ref('')
const stepInput = ref('')

const ingredientDraft = reactive({
  ingredientId: '',
  quantity: 1,
  unit: 'g' as OfficialRecipeMutation['ingredients'][number]['unit'],
  group: 'Principal',
  optional: false,
})

const emptyForm = (): OfficialRecipeMutation => ({
  title: '',
  slug: '',
  status: 'draft',
  portions: 4,
  durationMinutes: 25,
  difficulty: 'easy',
  categories: [],
  source: '',
  ingredients: [],
  steps: [],
  nutrition: {},
})

const form = reactive<OfficialRecipeMutation>(emptyForm())

const recipeQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }

  if (filters.search.trim()) {
    query.search = filters.search.trim()
  }
  if (filters.status) {
    query.status = filters.status
  }
  if (filters.difficulty) {
    query.difficulty = filters.difficulty
  }

  return query
})

const stats = computed(() => {
  const base = {
    all: recipes.value.length,
    draft: 0,
    review: 0,
    published: 0,
    archived: 0,
  }

  for (const recipe of recipes.value) {
    base[recipe.status] += 1
  }

  return base
})

const publicationIssues = computed(() => {
  const issues: string[] = []

  if (!form.title.trim()) issues.push('Titre')
  if (!form.slug.trim()) issues.push('Slug')
  if (!form.portions) issues.push('Portions')
  if (!form.durationMinutes) issues.push('Duree')
  if (!form.difficulty) issues.push('Difficulte')
  if (form.ingredients.length === 0) issues.push('Ingredients')
  if (form.steps.length === 0) issues.push('Etapes')
  if (!form.source?.trim()) issues.push('Source')

  return issues
})

const canPublish = computed(() => publicationIssues.value.length === 0)

const relationSummary = computed(() => ({
  ingredients: form.ingredients.length,
  steps: form.steps.length,
  calories: form.nutrition.calories ?? null,
}))

const statusLabel = (status: RecipeStatus | OfficialRecipeMutation['status']) => ({
  draft: 'Brouillon',
  review: 'En validation',
  published: 'Publiée',
  archived: 'Archivée',
}[status])

const statusTone = (status: RecipeStatus | OfficialRecipeMutation['status']) => ({
  draft: 'neutral',
  review: 'warning',
  published: 'success',
  archived: 'danger',
}[status] as 'neutral' | 'warning' | 'success' | 'danger')

const difficultyLabel = (difficulty: RecipeDifficulty | OfficialRecipeMutation['difficulty'] | null | undefined) => {
  if (!difficulty) return 'À compléter'

  return {
    easy: 'Facile',
    medium: 'Moyenne',
    hard: 'Difficile',
  }[difficulty]
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

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const resetForm = () => {
  Object.assign(form, emptyForm())
  categoryInput.value = ''
  stepInput.value = ''
  Object.assign(ingredientDraft, {
    ingredientId: '',
    quantity: 1,
    unit: 'g',
    group: 'Principal',
    optional: false,
  })
}

const fillForm = (recipe: AdminRecipeRow) => {
  Object.assign(form, {
    title: recipe.title,
    slug: recipe.slug,
    status: recipe.status,
    portions: recipe.portions ?? 4,
    durationMinutes: recipe.duration_minutes ?? 25,
    difficulty: recipe.difficulty ?? 'easy',
    categories: recipe.categories ?? [],
    source: recipe.source ?? '',
    ingredients: structuredClone(recipe.ingredients ?? []),
    steps: structuredClone(recipe.steps ?? []),
    nutrition: recipe.nutrition ?? {},
  })
}

const loadRecipes = async () => {
  loading.value = true
  feedback.value = ''

  try {
    const response = await $fetch<{ data: AdminRecipeRow[] }>('/api/admin/recipes', {
      query: recipeQuery.value,
    })

    recipes.value = response.data

    const selectedId = typeof route.query.selected === 'string' ? route.query.selected : selectedRecipe.value?.id
    if (selectedId) {
      const match = recipes.value.find((recipe) => recipe.id === selectedId)
      if (match) {
        await selectRecipe(match, false)
      }
    }
  }
  catch {
    feedback.value = 'Impossible de charger les recettes.'
  }
  finally {
    loading.value = false
  }
}

const loadIngredientCatalog = async () => {
  try {
    const response = await $fetch<{ data: IngredientCatalogRow[] }>('/api/admin/ingredients', {
      query: { limit: 100 },
    })
    ingredientCatalog.value = response.data
  }
  catch {
    ingredientCatalog.value = []
  }
}

const selectRecipe = async (recipe: AdminRecipeRow, updateRoute = true) => {
  selectedRecipe.value = recipe
  editorMode.value = 'closed'

  if (updateRoute) {
    await router.replace({ query: { ...route.query, selected: recipe.id } })
  }

  try {
    const response = await $fetch<{ data: AdminRecipeRow }>(`/api/admin/recipes/${recipe.id}/preview`)
    selectedRecipe.value = response.data
  }
  catch {
    selectedRecipe.value = recipe
  }
}

const startCreate = () => {
  selectedRecipe.value = null
  resetForm()
  editorMode.value = 'create'
  feedback.value = ''
}

const startEdit = () => {
  if (!selectedRecipe.value) return
  fillForm(selectedRecipe.value)
  editorMode.value = 'edit'
  feedback.value = ''
}

const saveRecipe = async () => {
  saving.value = true
  feedback.value = ''

  try {
    const endpoint = editorMode.value === 'edit' && selectedRecipe.value
      ? `/api/admin/recipes/${selectedRecipe.value.id}`
      : '/api/admin/recipes'
    const method = editorMode.value === 'edit' ? 'PUT' : 'POST'

    const response = await $fetch<{ data: AdminRecipeRow }>(endpoint, {
      method,
      body: form,
    })

    feedback.value = editorMode.value === 'edit' ? 'Recette mise à jour.' : 'Recette créée.'
    selectedRecipe.value = response.data
    editorMode.value = 'closed'
    await loadRecipes()
  }
  catch {
    feedback.value = 'Impossible d’enregistrer la recette. Vérifie les champs obligatoires.'
  }
  finally {
    saving.value = false
  }
}

const onIngredientChange = () => {
  const ingredient = ingredientCatalog.value.find((item) => item.id === ingredientDraft.ingredientId)
  const units = ingredient?.units?.filter(Boolean) ?? []

  if (units.length > 0 && !units.includes(ingredientDraft.unit)) {
    ingredientDraft.unit = units[0] as OfficialRecipeMutation['ingredients'][number]['unit']
  }
}

const addIngredient = () => {
  const ingredient = ingredientCatalog.value.find((item) => item.id === ingredientDraft.ingredientId)
  if (!ingredient || ingredientDraft.quantity <= 0) return

  form.ingredients.push({
    ingredientId: ingredient.id,
    name: ingredient.name,
    quantity: Number(ingredientDraft.quantity),
    unit: ingredientDraft.unit,
    group: ingredientDraft.group.trim() || 'Principal',
    optional: ingredientDraft.optional,
  })

  Object.assign(ingredientDraft, {
    ingredientId: '',
    quantity: 1,
    unit: 'g',
    group: 'Principal',
    optional: false,
  })
}

const removeIngredient = (index: number) => {
  form.ingredients.splice(index, 1)
}

const moveIngredient = (index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= form.ingredients.length) return

  const [item] = form.ingredients.splice(index, 1)
  if (!item) return

  form.ingredients.splice(target, 0, item)
}

const addStep = () => {
  const instruction = stepInput.value.trim()
  if (!instruction) return

  form.steps.push({
    order: form.steps.length + 1,
    instruction,
  })
  stepInput.value = ''
}

const removeStep = (index: number) => {
  form.steps.splice(index, 1)
  form.steps.forEach((step, stepIndex) => {
    step.order = stepIndex + 1
  })
}

const moveStep = (index: number, direction: -1 | 1) => {
  const target = index + direction
  if (target < 0 || target >= form.steps.length) return

  const [item] = form.steps.splice(index, 1)
  if (!item) return

  form.steps.splice(target, 0, item)
  form.steps.forEach((step, stepIndex) => {
    step.order = stepIndex + 1
  })
}

const addCategory = () => {
  const category = categoryInput.value.trim()
  if (!category || form.categories.includes(category)) return

  form.categories.push(category)
  categoryInput.value = ''
}

const removeCategory = (category: string) => {
  form.categories = form.categories.filter((item) => item !== category)
}

const duplicateRecipe = async (recipe: AdminRecipeRow) => {
  actionPending.value = `duplicate:${recipe.id}`
  feedback.value = ''

  try {
    const response = await $fetch<{ data: AdminRecipeRow }>(`/api/admin/recipes/${recipe.id}/duplicate`, { method: 'POST' })
    feedback.value = 'Recette dupliquée en brouillon.'
    selectedRecipe.value = response.data
    await loadRecipes()
  }
  catch {
    feedback.value = 'Impossible de dupliquer la recette.'
  }
  finally {
    actionPending.value = ''
  }
}

const archiveRecipe = async (recipe: AdminRecipeRow) => {
  if (!confirm(`Archiver « ${recipe.title} » ?`)) return

  actionPending.value = `archive:${recipe.id}`
  feedback.value = ''

  try {
    const response = await $fetch<{ data: AdminRecipeRow }>(`/api/admin/recipes/${recipe.id}/archive`, { method: 'POST' })
    feedback.value = 'Recette archivée.'
    selectedRecipe.value = response.data
    await loadRecipes()
  }
  catch {
    feedback.value = 'Impossible d’archiver la recette.'
  }
  finally {
    actionPending.value = ''
  }
}

const deleteRecipe = async (recipe: AdminRecipeRow) => {
  if (!confirm(`Suppression définitive de « ${recipe.title} » ?`)) return

  actionPending.value = `delete:${recipe.id}`
  feedback.value = ''

  try {
    await $fetch(`/api/admin/recipes/${recipe.id}`, { method: 'DELETE' })
    feedback.value = 'Recette supprimée définitivement.'
    selectedRecipe.value = null
    editorMode.value = 'closed'
    await router.replace({ query: { ...route.query, selected: undefined } })
    await loadRecipes()
  }
  catch {
    feedback.value = 'Impossible de supprimer définitivement la recette.'
  }
  finally {
    actionPending.value = ''
  }
}

const applyStatusFilter = async (status: '' | RecipeStatus) => {
  filters.status = status
  await loadRecipes()
}

const clearFilters = async () => {
  filters.search = ''
  filters.status = ''
  filters.difficulty = ''
  await loadRecipes()
}

watch(
  () => form.title,
  (title) => {
    if (editorMode.value === 'create' && !form.slug) {
      form.slug = toSlug(title)
    }
  },
)

onMounted(() => {
  void loadRecipes()
  void loadIngredientCatalog()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-[#1f6b4a]">Catalogue officiel</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-[#101828]">Recettes</h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Liste, édition rapide et actions principales branchées sur les données utilisées par l’application mobile.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadRecipes">
          Rafraîchir
        </BaseButton>
        <BaseButton type="button" @click="startCreate">
          Nouvelle recette
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <button type="button" class="admin-stat-card text-left" :class="!filters.status ? 'ring-2 ring-[#0f2d27]/20' : ''" @click="applyStatusFilter('')">
        <span class="admin-stat-label">Total</span>
        <strong class="admin-stat-value">{{ stats.all }}</strong>
      </button>
      <button type="button" class="admin-stat-card text-left" :class="filters.status === 'published' ? 'ring-2 ring-[#22c55e]/25' : ''" @click="applyStatusFilter('published')">
        <span class="admin-stat-label">Publiées</span>
        <strong class="admin-stat-value text-[#1f6b4a]">{{ stats.published }}</strong>
      </button>
      <button type="button" class="admin-stat-card text-left" :class="filters.status === 'draft' ? 'ring-2 ring-[#f59e0b]/25' : ''" @click="applyStatusFilter('draft')">
        <span class="admin-stat-label">Brouillons</span>
        <strong class="admin-stat-value text-[#b85f16]">{{ stats.draft }}</strong>
      </button>
      <button type="button" class="admin-stat-card text-left" :class="filters.status === 'review' ? 'ring-2 ring-[#ffb020]/25' : ''" @click="applyStatusFilter('review')">
        <span class="admin-stat-label">En validation</span>
        <strong class="admin-stat-value text-[#d88400]">{{ stats.review }}</strong>
      </button>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]" @submit.prevent="loadRecipes">
      <label class="grid gap-1 text-sm font-bold text-[#344054]">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Nom ou slug..." />
      </label>
      <label class="grid gap-1 text-sm font-bold text-[#344054]">
        Statut
        <select v-model="filters.status">
          <option value="">Tous</option>
          <option value="draft">Brouillon</option>
          <option value="review">En validation</option>
          <option value="published">Publiée</option>
          <option value="archived">Archivée</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm font-bold text-[#344054]">
        Difficulté
        <select v-model="filters.difficulty">
          <option value="">Toutes</option>
          <option value="easy">Facile</option>
          <option value="medium">Moyenne</option>
          <option value="hard">Difficile</option>
        </select>
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton type="button" variant="ghost" @click="clearFilters">Effacer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-3 text-sm font-semibold text-[#344054] shadow-sm">
      {{ feedback }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section class="rounded-2xl border border-[#e6e1d8] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-black text-[#101828]">Catalogue</h2>
            <p class="mt-1 text-sm text-[#667085]">{{ recipes.length }} recette(s) chargée(s).</p>
          </div>
          <NuxtLink to="/admin/recettes/import" class="rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs font-bold text-[#344054] transition hover:bg-[#fbf7f0]">
            Import CSV
          </NuxtLink>
        </div>

        <div v-if="loading" class="mt-4 rounded-xl bg-[#fbf7f0] p-4 text-sm text-[#667085]">
          Chargement des recettes...
        </div>

        <div v-else-if="recipes.length === 0" class="mt-4 grid place-items-center rounded-2xl bg-[#fbf7f0] p-8 text-center">
          <div class="max-w-sm">
            <p class="text-sm font-black text-[#101828]">Aucune recette trouvée</p>
            <p class="mt-2 text-sm text-[#667085]">Aucun résultat ne correspond aux filtres actuels.</p>
            <BaseButton class="mt-4" type="button" @click="startCreate">Créer une recette</BaseButton>
          </div>
        </div>

        <div v-else class="mt-4 overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Recette</th>
                <th>Statut</th>
                <th>Détails</th>
                <th>Coût</th>
                <th>MAJ</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="recipe in recipes"
                :key="recipe.id"
                class="cursor-pointer transition hover:bg-[#fbfaf7]"
                :class="selectedRecipe?.id === recipe.id ? 'bg-[#eef7f1] shadow-[inset_4px_0_0_#0f2d27]' : ''"
                @click="selectRecipe(recipe)"
              >
                <td>
                  <span class="block max-w-[20rem] truncate font-black text-[#101828]">{{ recipe.title || 'Recette sans titre' }}</span>
                  <span class="block max-w-[20rem] truncate text-xs text-[#667085]">{{ recipe.slug }}</span>
                </td>
                <td>
                  <BaseBadge :tone="statusTone(recipe.status)">{{ statusLabel(recipe.status) }}</BaseBadge>
                </td>
                <td class="text-sm text-[#667085]">
                  {{ difficultyLabel(recipe.difficulty) }} · {{ recipe.duration_minutes ?? '—' }} min · {{ recipe.portions ?? '—' }} pers.
                </td>
                <td>{{ formatCurrency(recipe.mobile?.estimatedCost) }}</td>
                <td>{{ formatDate(recipe.updated_at) }}</td>
                <td>
                  <div class="flex justify-end gap-2" @click.stop>
                    <BaseButton size="sm" variant="secondary" type="button" @click="selectRecipe(recipe).then(startEdit)">Modifier</BaseButton>
                    <BaseButton size="sm" variant="ghost" type="button" :disabled="actionPending === `duplicate:${recipe.id}`" @click="duplicateRecipe(recipe)">Dupliquer</BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="grid gap-4">
        <section class="rounded-2xl border border-[#e6e1d8] bg-white p-4 shadow-sm">
          <div v-if="!selectedRecipe && editorMode !== 'create'" class="grid place-items-center rounded-2xl bg-[#fbf7f0] p-8 text-center">
            <div>
              <p class="font-black text-[#101828]">Sélectionne une recette</p>
              <p class="mt-2 text-sm text-[#667085]">Le détail et les actions apparaîtront ici.</p>
            </div>
          </div>

          <template v-else-if="selectedRecipe && editorMode === 'closed'">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="truncate text-lg font-black text-[#101828]">{{ selectedRecipe.title }}</h2>
                <p class="mt-1 truncate text-sm text-[#667085]">{{ selectedRecipe.slug }}</p>
              </div>
              <BaseBadge :tone="statusTone(selectedRecipe.status)">{{ statusLabel(selectedRecipe.status) }}</BaseBadge>
            </div>

            <dl class="mt-4 grid gap-3 text-sm">
              <div class="rounded-xl bg-[#fbf7f0] p-3">
                <dt class="font-bold text-[#667085]">Publication mobile</dt>
                <dd class="mt-1 font-black text-[#101828]">{{ selectedRecipe.mobile?.publicationStatus ?? selectedRecipe.status }}</dd>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="rounded-xl bg-[#fbf7f0] p-3">
                  <dt class="font-bold text-[#667085]">Durée</dt>
                  <dd class="mt-1 font-black text-[#101828]">{{ selectedRecipe.duration_minutes ?? '—' }} min</dd>
                </div>
                <div class="rounded-xl bg-[#fbf7f0] p-3">
                  <dt class="font-bold text-[#667085]">Portions</dt>
                  <dd class="mt-1 font-black text-[#101828]">{{ selectedRecipe.portions ?? '—' }}</dd>
                </div>
              </div>
              <div class="rounded-xl bg-[#fbf7f0] p-3">
                <dt class="font-bold text-[#667085]">Source</dt>
                <dd class="mt-1 text-[#101828]">{{ selectedRecipe.source || 'Non renseignée' }}</dd>
              </div>
            </dl>

            <div class="mt-4 grid gap-3">
              <div class="rounded-2xl border border-[#e6e1d8] bg-[#fbfaf7] p-3">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Ingredients</p>
                  <BaseBadge tone="neutral">{{ selectedRecipe.ingredients.length }}</BaseBadge>
                </div>
                <ul v-if="selectedRecipe.ingredients.length" class="mt-3 grid gap-2">
                  <li
                    v-for="ingredient in selectedRecipe.ingredients.slice(0, 5)"
                    :key="`${ingredient.ingredientId}:${ingredient.name}`"
                    class="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"
                  >
                    <span class="min-w-0 truncate font-bold text-[#101828]">{{ ingredient.name }}</span>
                    <span class="shrink-0 text-xs text-[#667085]">{{ ingredient.quantity }} {{ ingredient.unit }}</span>
                  </li>
                </ul>
                <p v-else class="mt-3 text-sm text-[#98a2b3]">Aucun ingredient.</p>
              </div>

              <div class="rounded-2xl border border-[#e6e1d8] bg-[#fbfaf7] p-3">
                <div class="flex items-center justify-between gap-3">
                  <p class="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">Etapes</p>
                  <BaseBadge tone="neutral">{{ selectedRecipe.steps.length }}</BaseBadge>
                </div>
                <ol v-if="selectedRecipe.steps.length" class="mt-3 grid gap-2">
                  <li
                    v-for="step in selectedRecipe.steps.slice(0, 4)"
                    :key="`${step.order}:${step.instruction}`"
                    class="rounded-xl bg-white px-3 py-2 text-sm text-[#344054]"
                  >
                    <span class="font-black text-[#0f2d27]">{{ step.order }}.</span>
                    {{ step.instruction }}
                  </li>
                </ol>
                <p v-else class="mt-3 text-sm text-[#98a2b3]">Aucune etape.</p>
              </div>
            </div>

            <div class="mt-4 grid gap-2">
              <BaseButton type="button" @click="startEdit">Modifier</BaseButton>
              <BaseButton type="button" variant="secondary" :disabled="actionPending === `duplicate:${selectedRecipe.id}`" @click="duplicateRecipe(selectedRecipe)">Dupliquer en brouillon</BaseButton>
              <BaseButton type="button" variant="secondary" :disabled="actionPending === `archive:${selectedRecipe.id}`" @click="archiveRecipe(selectedRecipe)">Archiver</BaseButton>
              <BaseButton type="button" variant="ghost" :disabled="actionPending === `delete:${selectedRecipe.id}`" @click="deleteRecipe(selectedRecipe)">Supprimer définitivement</BaseButton>
            </div>
          </template>

          <form v-else class="grid gap-4" @submit.prevent="saveRecipe">
            <div>
              <h2 class="text-lg font-black text-[#101828]">{{ editorMode === 'edit' ? 'Modifier la recette' : 'Nouvelle recette' }}</h2>
              <p class="mt-1 text-sm text-[#667085]">Édition rapide des informations principales.</p>
            </div>

            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Titre
              <input v-model="form.title" required />
            </label>
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Slug
              <input v-model="form.slug" required />
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="grid gap-1 text-sm font-bold text-[#344054]">
                Portions
                <input v-model.number="form.portions" type="number" min="1" max="24" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-[#344054]">
                Durée
                <input v-model.number="form.durationMinutes" type="number" min="1" max="1440" />
              </label>
            </div>
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Difficulté
              <select v-model="form.difficulty">
                <option value="easy">Facile</option>
                <option value="medium">Moyenne</option>
                <option value="hard">Difficile</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Statut
              <select v-model="form.status">
                <option value="draft">Brouillon</option>
                <option value="review">En validation</option>
                <option value="published">Publiée</option>
                <option value="archived">Archivée</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Source
              <input v-model="form.source" placeholder="Source, auteur, lien..." />
            </label>

            <section class="rounded-2xl border border-[#e6e1d8] bg-[#fbfaf7] p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-black text-[#101828]">Ingredients</h3>
                  <p class="mt-1 text-xs text-[#667085]">
                    Ces lignes alimentent directement la fiche recette et les calculs mobile.
                  </p>
                </div>
                <BaseBadge tone="neutral">{{ relationSummary.ingredients }}</BaseBadge>
              </div>

              <div class="mt-4 grid gap-2">
                <div class="grid gap-2 md:grid-cols-[1.3fr_0.6fr_0.7fr]">
                  <select v-model="ingredientDraft.ingredientId" class="min-w-0" @change="onIngredientChange">
                    <option value="">Choisir un ingredient</option>
                    <option v-for="ingredient in ingredientCatalog" :key="ingredient.id" :value="ingredient.id">
                      {{ ingredient.name }}
                    </option>
                  </select>
                  <input v-model.number="ingredientDraft.quantity" type="number" min="0.01" step="0.01" placeholder="Qté" />
                  <select v-model="ingredientDraft.unit">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="piece">piece</option>
                    <option value="tbsp">c. soupe</option>
                    <option value="tsp">c. cafe</option>
                  </select>
                </div>
                <div class="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                  <input v-model="ingredientDraft.group" placeholder="Groupe, ex. Sauce" />
                  <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-[#e6e1d8] bg-white px-3 py-2 text-xs font-bold text-[#344054]">
                    <input v-model="ingredientDraft.optional" type="checkbox" />
                    Optionnel
                  </label>
                  <BaseButton type="button" variant="secondary" @click="addIngredient">Ajouter</BaseButton>
                </div>
              </div>

              <div v-if="form.ingredients.length" class="mt-4 grid gap-2">
                <div
                  v-for="(ingredient, index) in form.ingredients"
                  :key="`${ingredient.ingredientId}:${index}`"
                  class="grid gap-2 rounded-xl border border-[#e6e1d8] bg-white p-3 text-sm md:grid-cols-[1fr_5.5rem_6rem_auto]"
                >
                  <input v-model="ingredient.name" class="font-bold" />
                  <input v-model.number="ingredient.quantity" type="number" min="0.01" step="0.01" />
                  <select v-model="ingredient.unit">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="piece">piece</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                  </select>
                  <div class="flex justify-end gap-1">
                    <button type="button" class="rounded-lg px-2 text-xs font-black text-[#667085] hover:bg-[#fbf7f0]" @click="moveIngredient(index, -1)">↑</button>
                    <button type="button" class="rounded-lg px-2 text-xs font-black text-[#667085] hover:bg-[#fbf7f0]" @click="moveIngredient(index, 1)">↓</button>
                    <button type="button" class="rounded-lg px-2 text-xs font-black text-[#b42318] hover:bg-[#fff1f0]" @click="removeIngredient(index)">Retirer</button>
                  </div>
                </div>
              </div>
              <p v-else class="mt-4 rounded-xl bg-white p-3 text-sm text-[#98a2b3]">
                Aucun ingredient ajoute.
              </p>
            </section>

            <section class="rounded-2xl border border-[#e6e1d8] bg-[#fbfaf7] p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="text-sm font-black text-[#101828]">Etapes</h3>
                  <p class="mt-1 text-xs text-[#667085]">Ordre, instructions et controle avant publication.</p>
                </div>
                <BaseBadge tone="neutral">{{ relationSummary.steps }}</BaseBadge>
              </div>

              <div class="mt-4 flex gap-2">
                <input v-model="stepInput" class="min-w-0 flex-1" placeholder="Ajouter une instruction..." @keyup.enter.prevent="addStep" />
                <BaseButton type="button" variant="secondary" @click="addStep">Ajouter</BaseButton>
              </div>

              <div v-if="form.steps.length" class="mt-4 grid gap-2">
                <div
                  v-for="(step, index) in form.steps"
                  :key="`${step.order}:${index}`"
                  class="grid gap-2 rounded-xl border border-[#e6e1d8] bg-white p-3 md:grid-cols-[2rem_1fr_auto]"
                >
                  <span class="pt-2 text-sm font-black text-[#0f2d27]">{{ index + 1 }}</span>
                  <textarea v-model="step.instruction" rows="2" class="resize-none" />
                  <div class="flex items-start justify-end gap-1">
                    <button type="button" class="rounded-lg px-2 py-2 text-xs font-black text-[#667085] hover:bg-[#fbf7f0]" @click="moveStep(index, -1)">↑</button>
                    <button type="button" class="rounded-lg px-2 py-2 text-xs font-black text-[#667085] hover:bg-[#fbf7f0]" @click="moveStep(index, 1)">↓</button>
                    <button type="button" class="rounded-lg px-2 py-2 text-xs font-black text-[#b42318] hover:bg-[#fff1f0]" @click="removeStep(index)">Retirer</button>
                  </div>
                </div>
              </div>
              <p v-else class="mt-4 rounded-xl bg-white p-3 text-sm text-[#98a2b3]">
                Aucune etape ajoutee.
              </p>
            </section>

            <section class="rounded-2xl border border-[#e6e1d8] bg-[#fbfaf7] p-4">
              <h3 class="text-sm font-black text-[#101828]">Categories et nutrition</h3>
              <div class="mt-4 flex gap-2">
                <input v-model="categoryInput" class="min-w-0 flex-1" placeholder="Ajouter une categorie..." @keyup.enter.prevent="addCategory" />
                <BaseButton type="button" variant="secondary" @click="addCategory">Ajouter</BaseButton>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="category in form.categories"
                  :key="category"
                  type="button"
                  class="rounded-full border border-[#d6e6dc] bg-white px-3 py-1.5 text-xs font-bold text-[#344054] transition hover:border-[#0f2d27]"
                  @click="removeCategory(category)"
                >
                  {{ category }} ×
                </button>
              </div>

              <div class="mt-4 grid gap-2 md:grid-cols-2">
                <label class="grid gap-1 text-xs font-bold text-[#344054]">
                  Calories
                  <input v-model.number="form.nutrition.calories" type="number" min="0" max="4000" />
                </label>
                <label class="grid gap-1 text-xs font-bold text-[#344054]">
                  Proteines (g)
                  <input v-model.number="form.nutrition.proteinGrams" type="number" min="0" max="500" step="0.1" />
                </label>
                <label class="grid gap-1 text-xs font-bold text-[#344054]">
                  Glucides (g)
                  <input v-model.number="form.nutrition.carbsGrams" type="number" min="0" max="800" step="0.1" />
                </label>
                <label class="grid gap-1 text-xs font-bold text-[#344054]">
                  Lipides (g)
                  <input v-model.number="form.nutrition.fatGrams" type="number" min="0" max="500" step="0.1" />
                </label>
              </div>
            </section>

            <div
              v-if="!canPublish"
              class="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-xs text-[#9a3412]"
            >
              Publication bloquee tant que ces champs manquent :
              <span class="font-black">{{ publicationIssues.join(', ') }}</span>.
            </div>

            <div class="flex flex-wrap gap-2">
              <BaseButton type="submit" :disabled="saving">{{ saving ? 'Enregistrement...' : 'Enregistrer' }}</BaseButton>
              <BaseButton type="button" variant="secondary" @click="editorMode = 'closed'">Annuler</BaseButton>
            </div>
          </form>
        </section>
      </aside>
    </div>
  </section>
</template>
