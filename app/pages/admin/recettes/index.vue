<script setup lang="ts">
import type { OfficialRecipeMutation } from '#shared/validation/course'
import {
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

type AdminIngredientRow = {
  id: string
  name: string
  status: 'active' | 'archived'
  units: string[]
  mobile?: {
    defaultUnit?: string | null
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
const loading = ref(true)
const saving = ref(false)
const recipes = ref<AdminRecipeRow[]>([])
const ingredientsCatalog = ref<AdminIngredientRow[]>([])
const recipePage = ref(1)
const recipePageSize = 30
const targetPortions = ref(4)
const editorRef = ref<HTMLElement | null>(null)
const activeEditorTab = ref<'identity' | 'ingredients' | 'steps' | 'preview'>('identity')
const suppressDraftSave = ref(false)
const draftRestored = ref(false)
const recipeDraftStorageKey = 'coursia-admin-recipe-draft'
const editorTabs = ['identity', 'ingredients', 'steps', 'preview'] as const

const visibleRecipes = computed(() =>
  recipes.value.slice(0, recipePage.value * recipePageSize),
)

const hasMoreRecipes = computed(() => recipes.value.length > visibleRecipes.value.length)

const activeFilterCount = computed(() =>
  [filters.search.trim(), filters.status, filters.difficulty, filters.category.trim()].filter(Boolean).length,
)

const selectedRecipe = computed(() =>
  recipes.value.find((recipe) => recipe.id === selectedRecipeId.value) ?? null,
)

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

  if (filters.category.trim()) {
    query.category = filters.category.trim()
  }

  return query
})

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

const activeIngredientsCatalog = computed(() =>
  ingredientsCatalog.value.filter((ingredient) => ingredient.status !== 'archived'),
)

const editorTitle = computed(() =>
  selectedRecipeId.value ? 'Modifier la recette' : 'Nouvelle recette',
)

const editorSubtitle = computed(() =>
  selectedRecipeId.value
    ? 'Les changements sont sauvegardés dans les tables consommées par l’application mobile.'
    : 'Le brouillon est conservé localement tant que la recette n’est pas enregistrée.',
)

const activeEditorTabIndex = computed(() =>
  editorTabs.findIndex((tab) => tab === activeEditorTab.value),
)

const canGoPreviousEditorTab = computed(() => activeEditorTabIndex.value > 0)
const canGoNextEditorTab = computed(() => activeEditorTabIndex.value < editorTabs.length - 1)

const goToPreviousEditorTab = () => {
  if (!canGoPreviousEditorTab.value) return
  activeEditorTab.value = editorTabs[activeEditorTabIndex.value - 1] ?? 'identity'
}

const goToNextEditorTab = () => {
  if (!canGoNextEditorTab.value) return
  activeEditorTab.value = editorTabs[activeEditorTabIndex.value + 1] ?? 'preview'
}

const draftStatusLabel = computed(() => {
  if (saving.value) return 'Sauvegarde serveur en cours'
  if (draftRestored.value) return 'Brouillon local restauré'
  if (!selectedRecipeId.value) return 'Brouillon local actif'
  return 'Édition d’une recette existante'
})

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

const statusDescriptions = {
  draft: 'Travail interne, invisible dans l’app.',
  review: 'Prêt à contrôler avant publication.',
  published: 'Disponible côté utilisateur.',
  archived: 'Retiré du catalogue actif.',
} as const

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

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const resetForm = () => {
  Object.assign(form, createEmptyForm())
  selectedRecipeId.value = null
  targetPortions.value = 4
  activeEditorTab.value = 'identity'
}

const clearFilters = async () => {
  filters.search = ''
  filters.status = ''
  filters.difficulty = ''
  filters.category = ''
  await loadRecipes()
}

const scrollToEditor = () => {
  nextTick(() => {
    editorRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const clearLocalDraft = () => {
  if (import.meta.client) {
    localStorage.removeItem(recipeDraftStorageKey)
  }
}

const startNewRecipe = () => {
  suppressDraftSave.value = true
  resetForm()
  clearLocalDraft()
  draftRestored.value = false
  suppressDraftSave.value = false
  feedback.value = 'Nouvelle recette prête. Le brouillon sera conservé automatiquement.'
  scrollToEditor()
}

const fillFormFromRecipe = (recipe: AdminRecipeRow) => {
  suppressDraftSave.value = true
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
  activeEditorTab.value = 'identity'
  suppressDraftSave.value = false
  feedback.value = `Recette sélectionnée : ${recipe.title}`
}

const selectRecipe = async (recipe: AdminRecipeRow) => {
  selectedRecipeId.value = recipe.id
  feedback.value = `Chargement de ${recipe.title}...`

  try {
    const response = await $fetch<{ data: AdminRecipeRow }>(`/api/admin/recipes/${recipe.id}/preview`)
    fillFormFromRecipe(response.data)
  } catch {
    fillFormFromRecipe(recipe)
    feedback.value = 'Détail indisponible, seule la fiche résumée est chargée.'
  }
  scrollToEditor()
}

const loadRecipes = async () => {
  loading.value = true
  feedback.value = ''

  try {
    const response = await $fetch<{ data: AdminRecipeRow[] }>('/api/admin/recipes', {
      query: recipeQuery.value,
    })
    recipes.value = response.data
    recipePage.value = 1
  } catch {
    feedback.value = 'Erreur de chargement des recettes officielles.'
  } finally {
    loading.value = false
  }
}

const loadIngredientsCatalog = async () => {
  try {
    const response = await $fetch<{ data: AdminIngredientRow[] }>('/api/admin/ingredients', {
      query: {
        limit: 200,
      },
    })
    ingredientsCatalog.value = response.data
  } catch {
    feedback.value = 'Catalogue ingrédients indisponible.'
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

    const response = await $fetch<{ data: AdminRecipeRow }>(endpoint, {
      method,
      body: form,
    })
    feedback.value = selectedRecipeId.value ? 'Recette mise à jour.' : 'Recette créée.'
    clearLocalDraft()
    draftRestored.value = false
    await loadRecipes()
    if (response.data) {
      fillFormFromRecipe(response.data)
    }
  } catch {
    feedback.value = 'Impossible d’enregistrer la recette.'
  } finally {
    saving.value = false
  }
}

watch(
  () => form.title,
  (title) => {
    if (!selectedRecipeId.value && !form.slug) {
      form.slug = toSlug(title)
    }
  },
)

watch(
  () => ({
    selectedRecipeId: selectedRecipeId.value,
    targetPortions: targetPortions.value,
    form: structuredClone(form),
  }),
  (draft) => {
    if (!import.meta.client || suppressDraftSave.value) return
    localStorage.setItem(recipeDraftStorageKey, JSON.stringify(draft))
  },
  { deep: true },
)

const restoreLocalDraft = () => {
  if (!import.meta.client) return

  const rawDraft = localStorage.getItem(recipeDraftStorageKey)
  if (!rawDraft) return

  try {
    const draft = JSON.parse(rawDraft) as {
      selectedRecipeId?: string | null
      targetPortions?: number
      form?: OfficialRecipeMutation
    }

    if (!draft.form) return

    suppressDraftSave.value = true
    Object.assign(form, createEmptyForm(), draft.form)
    selectedRecipeId.value = draft.selectedRecipeId ?? null
    targetPortions.value = draft.targetPortions ?? form.portions ?? 4
    activeEditorTab.value = 'identity'
    suppressDraftSave.value = false
    draftRestored.value = true
    feedback.value = 'Brouillon local restauré.'
  } catch {
    clearLocalDraft()
  }
}

const getDefaultIngredientUnit = (ingredient: AdminIngredientRow) => {
  const unit = ingredient.units[0] ?? ingredient.mobile?.defaultUnit ?? 'g'

  if (unit === 'unite') return 'piece'
  if (unit === 'cs') return 'tbsp'
  if (unit === 'cc') return 'tsp'

  return unit
}

const syncIngredientName = (index: number) => {
  const ingredient = form.ingredients[index]
  if (!ingredient) return

  const catalogItem = ingredientsCatalog.value.find((item) => item.id === ingredient.ingredientId)
  if (!catalogItem) return

  ingredient.name = catalogItem.name
}

const addIngredient = () => {
  const ingredient = activeIngredientsCatalog.value[0]

  if (!ingredient) {
    feedback.value = 'Aucun ingrédient canonique disponible.'
    return
  }

  form.ingredients.push({
    ingredientId: ingredient.id,
    name: ingredient.name,
    quantity: 1,
    unit: getDefaultIngredientUnit(ingredient) as OfficialRecipeMutation['ingredients'][number]['unit'],
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
  restoreLocalDraft()
  void loadIngredientsCatalog()
  void loadRecipes()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-[#1f6b4a]">Catalogue officiel</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-[#101828]">Recettes</h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Gestion du catalogue consommé par l’application mobile : brouillons, publication, duplication,
          archivage, ingrédients structurés et étapes.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadRecipes">
          Rafraîchir
        </BaseButton>
        <BaseButton type="button" @click="startNewRecipe">
          Nouvelle recette
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <button
        type="button"
        class="admin-stat-card text-left transition hover:-translate-y-0.5"
        :class="!filters.status ? 'ring-2 ring-[#0f2d27]/20' : ''"
        @click="filters.status = ''; loadRecipes()"
      >
        <span class="admin-stat-label">Total</span>
        <strong class="admin-stat-value">{{ recipeStats.all }}</strong>
      </button>
      <button
        type="button"
        class="admin-stat-card text-left transition hover:-translate-y-0.5"
        :class="filters.status === 'published' ? 'ring-2 ring-[#22c55e]/25' : ''"
        @click="filters.status = 'published'; loadRecipes()"
      >
        <span class="admin-stat-label">Publiées</span>
        <strong class="admin-stat-value text-[#1f6b4a]">{{ recipeStats.published }}</strong>
      </button>
      <button
        type="button"
        class="admin-stat-card text-left transition hover:-translate-y-0.5"
        :class="filters.status === 'draft' ? 'ring-2 ring-[#f59e0b]/25' : ''"
        @click="filters.status = 'draft'; loadRecipes()"
      >
        <span class="admin-stat-label">Brouillons</span>
        <strong class="admin-stat-value text-[#b85f16]">{{ recipeStats.draft }}</strong>
      </button>
      <button
        type="button"
        class="admin-stat-card text-left transition hover:-translate-y-0.5"
        :class="filters.status === 'review' ? 'ring-2 ring-[#ffb020]/25' : ''"
        @click="filters.status = 'review'; loadRecipes()"
      >
        <span class="admin-stat-label">En validation</span>
        <strong class="admin-stat-value text-[#d88400]">{{ recipeStats.review }}</strong>
      </button>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_auto]" @submit.prevent="loadRecipes">
      <label class="grid gap-1 text-sm font-bold text-[#344054]">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Nom, slug, ingrédient..." />
      </label>
      <label class="grid gap-1 text-sm font-bold text-[#344054]">
        Statut
        <select v-model="filters.status">
          <option value="">Tous</option>
          <option value="draft">Brouillon</option>
          <option value="review">En validation</option>
          <option value="published">Publié</option>
          <option value="archived">Archivé</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm font-bold text-[#344054]">
        Difficulté
        <select v-model="filters.difficulty">
          <option value="">Toutes</option>
          <option value="easy">Facile</option>
          <option value="medium">Moyen</option>
          <option value="hard">Difficile</option>
        </select>
      </label>
      <label class="grid gap-1 text-sm font-bold text-[#344054]">
        Catégorie
        <input v-model="filters.category" type="search" placeholder="rapide, famille..." />
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" class="w-full" :disabled="loading">Appliquer</BaseButton>
        <BaseButton
          v-if="activeFilterCount"
          type="button"
          variant="ghost"
          @click="clearFilters"
        >
          Effacer
        </BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-3 text-sm font-semibold text-[#344054] shadow-sm">
      {{ feedback }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <section class="rounded-2xl border border-[#e6e1d8] bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-black text-[#101828]">Catalogue</h2>
            <p class="mt-1 text-sm text-[#667085]">{{ visibleRecipes.length }} affichée(s) sur {{ recipes.length }}.</p>
          </div>
          <NuxtLink to="/admin/recettes/import" class="rounded-lg border border-[#e6e1d8] px-3 py-2 text-xs font-bold text-[#344054] transition hover:bg-[#fbf7f0]">
            Import CSV
          </NuxtLink>
        </div>

        <div v-if="loading" class="mt-4 rounded-xl bg-[#fbf7f0] p-4 text-sm text-[#667085]">
          Chargement des recettes...
        </div>
        <div v-else-if="recipes.length === 0" class="mt-4 grid place-items-center rounded-2xl bg-[#fbf7f0] p-8 text-center">
          <div class="max-w-sm">
            <p class="text-sm font-semibold text-[#101828]">Aucune recette trouvée</p>
            <p class="mt-2 text-sm text-[#667085]">
              Aucun résultat ne correspond aux filtres actuels. Réinitialise les filtres ou crée une nouvelle fiche.
            </p>
            <div class="mt-4 flex justify-center gap-2">
              <BaseButton v-if="activeFilterCount" type="button" variant="secondary" @click="clearFilters">
                Réinitialiser
              </BaseButton>
              <BaseButton type="button" @click="startNewRecipe">Créer</BaseButton>
            </div>
          </div>
        </div>

        <div v-else class="mt-4 overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Recette</th>
                <th>Statut</th>
                <th>Durée</th>
                <th>Coût</th>
                <th>MAJ</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="recipe in visibleRecipes"
                :key="recipe.id"
                class="transition hover:bg-[#fbfaf7]"
                :class="selectedRecipeId === recipe.id ? 'bg-[#eef7f1] shadow-[inset_4px_0_0_#0f2d27]' : ''"
              >
                <td>
                  <button type="button" class="block w-full max-w-[24rem] text-left" @click="selectRecipe(recipe)">
                    <span class="block truncate font-black text-[#101828]">{{ recipe.title || 'Recette sans titre' }}</span>
                    <span class="block truncate text-xs text-[#667085]">
                      {{ recipe.slug }} · {{ difficultyLabel(recipe.difficulty) }} · {{ recipe.portions ?? '—' }} portions
                    </span>
                  </button>
                </td>
                <td>
                  <div class="grid gap-1">
                    <BaseBadge :tone="statusTone(recipe.status)">{{ statusLabel(recipe.status) }}</BaseBadge>
                    <span class="text-xs text-[#98a2b3]">{{ statusDescriptions[recipe.status] }}</span>
                  </div>
                </td>
                <td>{{ recipe.duration_minutes ?? '—' }} min</td>
                <td>{{ formatCurrency(recipe.mobile?.estimatedCost) }}</td>
                <td>{{ formatDate(recipe.updated_at) }}</td>
                <td>
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="secondary" type="button" @click="selectRecipe(recipe)">Modifier</BaseButton>
                    <BaseButton size="sm" variant="ghost" type="button" @click="duplicateRecipe(recipe.id)">Dupliquer</BaseButton>
                    <BaseButton size="sm" variant="ghost" type="button" @click="archiveRecipe(recipe.id)">Archiver</BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <BaseButton v-if="hasMoreRecipes" class="mt-4" type="button" variant="secondary" @click="recipePage += 1">
            Afficher plus
          </BaseButton>
        </div>
      </section>

      <aside ref="editorRef" class="grid gap-4 scroll-mt-8">
        <form class="rounded-2xl border border-[#e6e1d8] bg-white p-4 shadow-sm" @submit.prevent="saveRecipe">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-base font-black text-[#101828]">{{ editorTitle }}</h2>
              <p class="mt-1 text-sm text-[#667085]">{{ editorSubtitle }}</p>
              <p v-if="selectedRecipe" class="mt-2 text-xs font-semibold text-[#667085]">
                Sélection : {{ selectedRecipe.title }} · {{ formatDate(selectedRecipe.updated_at) }}
              </p>
            </div>
            <BaseBadge :tone="statusTone(form.status)">{{ statusLabel(form.status) }}</BaseBadge>
          </div>

          <div class="mt-4 grid gap-2 rounded-2xl border border-[#e6e1d8] bg-[#fbf7f0] p-3 text-xs text-[#667085]">
            <div class="flex items-center justify-between gap-3">
              <span class="font-bold uppercase tracking-[0.12em]">{{ draftStatusLabel }}</span>
              <span>{{ form.ingredients.length }} ingrédient(s) · {{ form.steps.length }} étape(s)</span>
            </div>
            <p>{{ statusDescriptions[form.status] }}</p>
          </div>

          <div class="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[#f4efe7] p-1 text-xs font-black text-[#667085]">
            <button type="button" class="rounded-xl px-2 py-2 transition" :class="activeEditorTab === 'identity' ? 'bg-white text-[#0f3d34] shadow-sm' : 'hover:bg-white/60'" @click="activeEditorTab = 'identity'">Infos</button>
            <button type="button" class="rounded-xl px-2 py-2 transition" :class="activeEditorTab === 'ingredients' ? 'bg-white text-[#0f3d34] shadow-sm' : 'hover:bg-white/60'" @click="activeEditorTab = 'ingredients'">Ingrédients</button>
            <button type="button" class="rounded-xl px-2 py-2 transition" :class="activeEditorTab === 'steps' ? 'bg-white text-[#0f3d34] shadow-sm' : 'hover:bg-white/60'" @click="activeEditorTab = 'steps'">Étapes</button>
            <button type="button" class="rounded-xl px-2 py-2 transition" :class="activeEditorTab === 'preview' ? 'bg-white text-[#0f3d34] shadow-sm' : 'hover:bg-white/60'" @click="activeEditorTab = 'preview'">Aperçu</button>
          </div>

          <div v-show="activeEditorTab === 'identity'" class="mt-4 grid gap-3">
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Titre
              <input v-model="form.title" required />
            </label>
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Slug
              <input v-model="form.slug" required />
            </label>
            <div class="grid gap-2 sm:grid-cols-3">
              <label class="grid gap-1 text-sm font-bold text-[#344054]">
                Portions
                <input v-model.number="form.portions" type="number" min="1" max="24" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-[#344054]">
                Durée
                <input v-model.number="form.durationMinutes" type="number" min="1" max="1440" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-[#344054]">
                Difficulté
                <select v-model="form.difficulty">
                  <option :value="undefined">À compléter</option>
                  <option value="easy">Facile</option>
                  <option value="medium">Moyen</option>
                  <option value="hard">Difficile</option>
                </select>
              </label>
            </div>
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Statut
              <select v-model="form.status">
                <option value="draft">Brouillon</option>
                <option value="review">En validation</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Source
              <input v-model="form.source" />
            </label>
          </div>

          <div v-show="activeEditorTab === 'ingredients'" class="mt-4 grid gap-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-black text-[#101828]">{{ form.ingredients.length }} ingrédient(s)</p>
              <BaseButton type="button" size="sm" variant="secondary" @click="addIngredient">Ajouter</BaseButton>
            </div>
            <div v-for="(ingredient, index) in form.ingredients" :key="`${ingredient.ingredientId}-${index}`" class="rounded-xl border border-[#eee7dc] bg-[#fbf7f0] p-3">
              <label class="grid gap-1 text-sm font-bold text-[#344054]">
                Ingrédient canonique
                <select v-model="ingredient.ingredientId" @change="syncIngredientName(index)">
                  <option v-for="item in activeIngredientsCatalog" :key="item.id" :value="item.id">{{ item.name }}</option>
                </select>
              </label>
              <div class="mt-2 grid gap-2 sm:grid-cols-3">
                <input v-model.number="ingredient.quantity" type="number" min="0.01" step="0.01" />
                <select v-model="ingredient.unit">
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="piece">pièce</option>
                  <option value="tbsp">c. soupe</option>
                  <option value="tsp">c. café</option>
                </select>
                <input v-model="ingredient.group" placeholder="Groupe" />
              </div>
              <div class="mt-2 flex items-center justify-between">
                <label class="flex items-center gap-2 text-sm font-bold text-[#667085]">
                  <input v-model="ingredient.optional" type="checkbox" class="min-h-0 w-auto" />
                  Optionnel
                </label>
                <button type="button" class="text-sm font-bold text-[#ff5b45]" @click="removeIngredient(index)">Supprimer</button>
              </div>
            </div>
            <div v-if="formErrors.hasErrors" class="rounded-xl bg-[#ffe9e4] p-3 text-sm font-semibold text-[#ff5b45]">
              Doublons ou unités incompatibles détectés.
            </div>
          </div>

          <div v-show="activeEditorTab === 'steps'" class="mt-4 grid gap-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-black text-[#101828]">{{ form.steps.length }} étape(s)</p>
              <BaseButton type="button" size="sm" variant="secondary" @click="addStep">Ajouter</BaseButton>
            </div>
            <div v-for="(step, index) in form.steps" :key="index" class="rounded-xl border border-[#eee7dc] bg-[#fbf7f0] p-3">
              <label class="grid gap-1 text-sm font-bold text-[#344054]">
                Étape {{ index + 1 }}
                <textarea v-model="step.instruction" rows="4" />
              </label>
              <div class="mt-2 flex flex-wrap gap-2">
                <BaseButton type="button" size="sm" variant="secondary" @click="moveStep(index, -1)">Monter</BaseButton>
                <BaseButton type="button" size="sm" variant="secondary" @click="moveStep(index, 1)">Descendre</BaseButton>
                <BaseButton type="button" size="sm" variant="ghost" @click="removeStep(index)">Supprimer</BaseButton>
              </div>
            </div>
          </div>

          <div v-show="activeEditorTab === 'preview'" class="mt-4 grid gap-3">
            <label class="grid gap-1 text-sm font-bold text-[#344054]">
              Portions cible
              <input v-model.number="targetPortions" type="number" min="1" max="24" />
            </label>
            <ul class="grid gap-2 text-sm text-[#667085]">
              <li v-for="ingredient in portionPreview" :key="`${ingredient.ingredientId}-preview`" class="flex justify-between rounded-xl bg-[#fbf7f0] px-3 py-2">
                <span>{{ ingredient.name }}</span>
                <strong>{{ ingredient.scaledQuantity }} {{ ingredient.unit }}</strong>
              </li>
            </ul>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <BaseButton type="button" variant="secondary" @click="startNewRecipe">Nouvelle fiche</BaseButton>
            <BaseButton type="button" variant="secondary" :disabled="!canGoPreviousEditorTab" @click="goToPreviousEditorTab">Précédent</BaseButton>
            <BaseButton type="button" variant="secondary" :disabled="!canGoNextEditorTab" @click="goToNextEditorTab">Suivant</BaseButton>
            <BaseButton type="submit" :disabled="saving">{{ saving ? 'Enregistrement...' : 'Enregistrer' }}</BaseButton>
          </div>

          <button v-if="selectedRecipeId" type="button" class="mt-3 text-sm font-bold text-[#ff5b45] hover:underline" @click="deleteRecipe(selectedRecipeId)">
            Supprimer définitivement
          </button>
        </form>
      </aside>
    </div>
  </section>
</template>
