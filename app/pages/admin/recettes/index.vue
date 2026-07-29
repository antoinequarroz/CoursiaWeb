<script setup lang="ts">
import type { OfficialRecipeMutation } from '#shared/validation/course'

definePageMeta({
  layout: 'admin',
})

type RecipeStatus = 'draft' | 'review' | 'published' | 'archived'
type RecipeDifficulty = 'easy' | 'medium' | 'hard'
type EditorTab = 'identity' | 'ingredients' | 'steps' | 'quality'
type BadgeTone = 'neutral' | 'warning' | 'success' | 'danger'

type RecipeIngredient = OfficialRecipeMutation['ingredients'][number]
type RecipeStep = OfficialRecipeMutation['steps'][number]

type AdminRecipeRow = {
  id: string
  title: string
  slug: string
  status: RecipeStatus
  portions: number | null
  duration_minutes: number | null
  difficulty: RecipeDifficulty | null
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  nutrition: OfficialRecipeMutation['nutrition']
  categories: string[]
  source: string | null
  created_at?: string | null
  updated_at: string | null
  mobile?: {
    imageUrl?: string | null
    estimatedCost?: number | null
    publicationStatus?: string | null
  }
}

type IngredientCatalogRow = {
  id: string
  name: string
  units?: string[]
  categories?: string[]
}

type RecipeForm = {
  title: string
  slug: string
  status: RecipeStatus
  portions: number
  durationMinutes: number
  difficulty: RecipeDifficulty
  categories: string[]
  source: string
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  nutrition: {
    calories?: number
    proteinGrams?: number
    carbsGrams?: number
    fatGrams?: number
  }
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
const editorOpen = ref(false)
const editorTab = ref<EditorTab>('identity')
const editingRecipeId = ref<string | null>(null)
const categoryInput = ref('')
const stepInput = ref('')

const emptyForm = (): RecipeForm => ({
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

const form = reactive<RecipeForm>(emptyForm())

const ingredientDraft = reactive({
  ingredientId: '',
  quantity: 1,
  unit: 'g' as RecipeIngredient['unit'],
  group: 'Principal',
  optional: false,
})

const statusLabel: Record<RecipeStatus, string> = {
  draft: 'Brouillon',
  review: 'En validation',
  published: 'Publiée',
  archived: 'Archivée',
}

const statusTone: Record<RecipeStatus, BadgeTone> = {
  draft: 'neutral',
  review: 'warning',
  published: 'success',
  archived: 'danger',
}

const difficultyLabel: Record<RecipeDifficulty, string> = {
  easy: 'Facile',
  medium: 'Moyenne',
  hard: 'Difficile',
}

const tabLabel: Record<EditorTab, string> = {
  identity: 'Identité',
  ingredients: 'Ingrédients',
  steps: 'Étapes',
  quality: 'Contrôle',
}

const recipeQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }

  if (filters.search.trim()) query.search = filters.search.trim()
  if (filters.status) query.status = filters.status
  if (filters.difficulty) query.difficulty = filters.difficulty

  return query
})

const stats = computed(() => {
  const counts = {
    all: recipes.value.length,
    draft: 0,
    review: 0,
    published: 0,
    archived: 0,
  }

  for (const recipe of recipes.value) {
    counts[recipe.status] += 1
  }

  return counts
})

const qualityIssues = computed(() => {
  const issues: Array<{ key: string, label: string }> = []

  if (!form.title.trim()) issues.push({ key: 'title', label: 'Titre manquant' })
  if (!form.slug.trim()) issues.push({ key: 'slug', label: 'Slug manquant' })
  if (!form.portions) issues.push({ key: 'portions', label: 'Portions manquantes' })
  if (!form.durationMinutes) issues.push({ key: 'duration', label: 'Durée manquante' })
  if (!form.difficulty) issues.push({ key: 'difficulty', label: 'Difficulté manquante' })
  if (form.ingredients.length === 0) issues.push({ key: 'ingredients', label: 'Aucun ingrédient' })
  if (form.steps.length === 0) issues.push({ key: 'steps', label: 'Aucune étape' })
  if (!form.source.trim()) issues.push({ key: 'source', label: 'Source manquante' })

  return issues
})

const selectedQualityIssues = computed(() => {
  if (!selectedRecipe.value) return []

  const recipe = selectedRecipe.value
  const issues: string[] = []

  if (!recipe.title) issues.push('Titre')
  if (!recipe.slug) issues.push('Slug')
  if (!recipe.portions) issues.push('Portions')
  if (!recipe.duration_minutes) issues.push('Durée')
  if (!recipe.difficulty) issues.push('Difficulté')
  if (!recipe.ingredients.length) issues.push('Ingrédients')
  if (!recipe.steps.length) issues.push('Étapes')
  if (!recipe.source) issues.push('Source')

  return issues
})

const selectedCost = computed(() => selectedRecipe.value?.mobile?.estimatedCost ?? null)
const selectedImageUrl = computed(() => selectedRecipe.value?.mobile?.imageUrl ?? null)
const selectedCompletion = computed(() => {
  if (!selectedRecipe.value) return 0
  const total = 8
  const missing = selectedQualityIssues.value.length

  return Math.max(0, Math.round(((total - missing) / total) * 100))
})
const editorTitle = computed(() => editingRecipeId.value ? 'Modifier la recette' : 'Nouvelle recette')
const primaryActionLabel = computed(() => saving.value ? 'Enregistrement...' : editingRecipeId.value ? 'Enregistrer' : 'Créer la recette')

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('fr-CH', { dateStyle: 'medium' }).format(new Date(value))
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
    categories: [...(recipe.categories ?? [])],
    source: recipe.source ?? '',
    ingredients: structuredClone(recipe.ingredients ?? []),
    steps: structuredClone(recipe.steps ?? []),
    nutrition: { ...(recipe.nutrition ?? {}) },
  })
}

const buildPayload = (): OfficialRecipeMutation => ({
  title: form.title,
  slug: form.slug,
  status: form.status,
  portions: Number(form.portions),
  durationMinutes: Number(form.durationMinutes),
  difficulty: form.difficulty,
  categories: form.categories,
  source: form.source,
  ingredients: form.ingredients,
  steps: form.steps.map((step, index) => ({
    ...step,
    order: index + 1,
  })),
  nutrition: form.nutrition,
} as OfficialRecipeMutation)

const loadRecipes = async () => {
  loading.value = true
  feedback.value = ''

  try {
    const response = await $fetch<{ data: AdminRecipeRow[] }>('/api/admin/recipes', {
      query: recipeQuery.value,
    })

    recipes.value = response.data

    const selectedId = typeof route.query.selected === 'string'
      ? route.query.selected
      : selectedRecipe.value?.id

    if (selectedId) {
      const match = recipes.value.find((recipe) => recipe.id === selectedId)
      if (match) await selectRecipe(match, false)
    }
    else if (!selectedRecipe.value && recipes.value[0]) {
      await selectRecipe(recipes.value[0], false)
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
      query: { limit: 100, status: 'active' },
    })

    ingredientCatalog.value = response.data
  }
  catch {
    ingredientCatalog.value = []
  }
}

const selectRecipe = async (recipe: AdminRecipeRow, updateRoute = true) => {
  selectedRecipe.value = recipe
  editorOpen.value = false
  editingRecipeId.value = null

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
  editingRecipeId.value = null
  editorTab.value = 'identity'
  resetForm()
  editorOpen.value = true
  feedback.value = ''
}

const startEdit = () => {
  if (!selectedRecipe.value) return

  editingRecipeId.value = selectedRecipe.value.id
  editorTab.value = 'identity'
  fillForm(selectedRecipe.value)
  editorOpen.value = true
  feedback.value = ''
}

const closeEditor = () => {
  editorOpen.value = false
  editingRecipeId.value = null
  if (selectedRecipe.value) fillForm(selectedRecipe.value)
}

const saveRecipe = async () => {
  saving.value = true
  feedback.value = ''

  try {
    const endpoint = editingRecipeId.value
      ? `/api/admin/recipes/${editingRecipeId.value}`
      : '/api/admin/recipes'
    const method = editingRecipeId.value ? 'PUT' : 'POST'

    const response = await $fetch<{ data: AdminRecipeRow }>(endpoint, {
      method,
      body: buildPayload(),
    })

    selectedRecipe.value = response.data
    editorOpen.value = false
    editingRecipeId.value = null
    feedback.value = 'Recette enregistrée.'
    await loadRecipes()
  }
  catch {
    feedback.value = 'Enregistrement refusé. Vérifie les champs obligatoires.'
  }
  finally {
    saving.value = false
  }
}

const refreshSelectedAfterAction = async (response?: { data?: AdminRecipeRow }) => {
  if (response?.data) selectedRecipe.value = response.data
  await loadRecipes()
}

const runRecipeAction = async (
  recipe: AdminRecipeRow,
  action: 'duplicate' | 'submit-review' | 'publish' | 'unpublish' | 'archive',
) => {
  actionPending.value = `${action}:${recipe.id}`
  feedback.value = ''

  try {
    if (action === 'duplicate') {
      const response = await $fetch<{ data: AdminRecipeRow }>(`/api/admin/recipes/${recipe.id}/duplicate`, { method: 'POST' })
      selectedRecipe.value = response.data
      feedback.value = 'Recette dupliquée en brouillon.'
      await refreshSelectedAfterAction(response)
      return
    }

    const actionPath: Record<Exclude<typeof action, 'duplicate'>, string> = {
      'submit-review': 'submit-review',
      publish: 'publish',
      unpublish: 'unpublish',
      archive: 'archive',
    }

    const response = await $fetch<{ data: AdminRecipeRow }>(`/api/admin/recipes/${recipe.id}/${actionPath[action]}`, {
      method: 'POST',
      body: action === 'archive' ? undefined : { reason: 'Action depuis le back-office Coursia.' },
    })

    const messages = {
      'submit-review': 'Recette envoyée en validation.',
      publish: 'Recette publiée.',
      unpublish: 'Recette repassée en brouillon.',
      archive: 'Recette archivée.',
    } as const

    feedback.value = messages[action]
    await refreshSelectedAfterAction(response)
  }
  catch {
    feedback.value = 'Action impossible. La recette est peut-être incomplète ou ton rôle est insuffisant.'
  }
  finally {
    actionPending.value = ''
  }
}

const deleteRecipe = async (recipe: AdminRecipeRow) => {
  if (!confirm(`Supprimer définitivement « ${recipe.title} » ?`)) return

  actionPending.value = `delete:${recipe.id}`
  feedback.value = ''

  try {
    await $fetch(`/api/admin/recipes/${recipe.id}`, { method: 'DELETE' })
    selectedRecipe.value = null
    editorOpen.value = false
    feedback.value = 'Recette supprimée définitivement.'
    await router.replace({ query: { ...route.query, selected: undefined } })
    await loadRecipes()
  }
  catch {
    feedback.value = 'Suppression impossible.'
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

const onIngredientChange = () => {
  const ingredient = ingredientCatalog.value.find((item) => item.id === ingredientDraft.ingredientId)
  const units = ingredient?.units?.filter(Boolean) ?? []

  if (units.length > 0 && !units.includes(ingredientDraft.unit)) {
    ingredientDraft.unit = units[0] as RecipeIngredient['unit']
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

  form.steps.push({ order: form.steps.length + 1, instruction })
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

watch(
  () => form.title,
  (title) => {
    if (!editingRecipeId.value && !form.slug) {
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
    <AdminPageHeader
      eyebrow="COUR-96 / COUR-97"
      title="Recettes officielles"
      description="Crée, corrige et prépare les recettes qui alimentent le catalogue mobile Coursia."
    >
      <template #actions>
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadRecipes">
          Actualiser
        </BaseButton>
        <BaseButton type="button" @click="startCreate">
          Nouvelle recette
        </BaseButton>
      </template>
    </AdminPageHeader>

    <p v-if="feedback" class="rounded-2xl border border-coursia-primary/20 bg-coursia-primary/10 p-3 text-sm font-semibold text-coursia-primary">
      {{ feedback }}
    </p>

    <div class="grid gap-3 md:grid-cols-4">
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="!filters.status ? 'ring-2 ring-coursia-primary/20' : ''" @click="applyStatusFilter('')">
        <span>Total</span>
        <strong>{{ stats.all }}</strong>
        <small>recettes chargées</small>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'published' ? 'ring-2 ring-coursia-success/25' : ''" @click="applyStatusFilter('published')">
        <span>Publiées</span>
        <strong class="text-coursia-success">{{ stats.published }}</strong>
        <small>visibles côté app</small>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'review' ? 'ring-2 ring-coursia-warning/25' : ''" @click="applyStatusFilter('review')">
        <span>À valider</span>
        <strong class="text-coursia-warning">{{ stats.review }}</strong>
        <small>contrôle éditorial</small>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'draft' ? 'ring-2 ring-coursia-primary/15' : ''" @click="applyStatusFilter('draft')">
        <span>Brouillons</span>
        <strong>{{ stats.draft }}</strong>
        <small>travail en cours</small>
      </button>
    </div>

    <AdminPanel>
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
          Recherche
          <input v-model="filters.search" placeholder="Titre ou clé externe" @keydown.enter.prevent="loadRecipes">
        </label>
        <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
          Statut
          <select v-model="filters.status">
            <option value="">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="review">En validation</option>
            <option value="published">Publiée</option>
            <option value="archived">Archivée</option>
          </select>
        </label>
        <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
          Difficulté
          <select v-model="filters.difficulty">
            <option value="">Toutes</option>
            <option value="easy">Facile</option>
            <option value="medium">Moyenne</option>
            <option value="hard">Difficile</option>
          </select>
        </label>
        <div class="flex items-end gap-2">
          <BaseButton type="button" :disabled="loading" @click="loadRecipes">
            Filtrer
          </BaseButton>
          <BaseButton type="button" variant="ghost" @click="clearFilters">
            Réinitialiser
          </BaseButton>
        </div>
      </div>
    </AdminPanel>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <AdminPanel title="Catalogue" :description="loading ? 'Chargement...' : `${recipes.length} recette(s)`" :padded="false">
        <template #actions>
          <BaseBadge tone="neutral">Table mobile : recettes</BaseBadge>
        </template>

        <div v-if="loading" class="p-4 text-sm text-coursia-muted">
          Chargement des recettes...
        </div>

        <AdminEmptyState
          v-else-if="recipes.length === 0"
          icon="recipes"
          title="Aucune recette pour ces filtres"
          description="Change les filtres ou crée une nouvelle recette officielle."
        >
          <template #actions>
            <BaseButton type="button" variant="secondary" @click="clearFilters">Réinitialiser</BaseButton>
            <BaseButton type="button" @click="startCreate">Créer une recette</BaseButton>
          </template>
        </AdminEmptyState>
        <AdminTableShell v-else>
            <thead>
              <tr>
                <th class="text-left">Recette</th>
                <th class="text-left">Statut</th>
                <th class="text-left">Format</th>
                <th class="text-left">Qualité</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="recipe in recipes"
                :key="recipe.id"
                class="admin-row border-t border-coursia-border"
                :class="selectedRecipe?.id === recipe.id ? 'admin-row-selected' : ''"
                @click="selectRecipe(recipe)"
              >
                <td>
                  <div class="flex min-w-[260px] items-center gap-3">
                    <div class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-coursia-surface-muted">
                      <img v-if="recipe.mobile?.imageUrl" :src="recipe.mobile.imageUrl" :alt="recipe.title" class="h-full w-full object-cover">
                      <span v-else class="text-xs font-black text-coursia-primary">R</span>
                    </div>
                    <div>
                      <p class="font-black text-coursia-foreground">{{ recipe.title || 'Recette sans titre' }}</p>
                      <p class="mt-1 truncate text-xs text-coursia-muted">{{ recipe.slug }}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <BaseBadge :tone="statusTone[recipe.status]">{{ statusLabel[recipe.status] }}</BaseBadge>
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ recipe.portions ?? '—' }} pers. · {{ recipe.duration_minutes ?? '—' }} min · {{ recipe.difficulty ? difficultyLabel[recipe.difficulty] : '—' }}
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ recipe.ingredients.length }} ing. · {{ recipe.steps.length }} étapes
                </td>
                <td class="text-right">
                  <button type="button" class="rounded-xl px-3 py-2 text-xs font-black text-coursia-primary hover:bg-coursia-primary/10" @click.stop="selectRecipe(recipe)">
                    Ouvrir
                  </button>
                </td>
              </tr>
            </tbody>
        </AdminTableShell>
      </AdminPanel>

      <aside class="grid gap-4 content-start">
        <AdminPanel v-if="selectedRecipe">
          <div class="flex items-start justify-between gap-3">
            <div>
              <BaseBadge :tone="statusTone[selectedRecipe.status]">{{ statusLabel[selectedRecipe.status] }}</BaseBadge>
              <h2 class="mt-3 text-xl font-black tracking-tight text-coursia-foreground">{{ selectedRecipe.title }}</h2>
              <p class="mt-1 break-all text-xs text-coursia-muted">{{ selectedRecipe.slug }}</p>
            </div>
            <button type="button" class="rounded-xl px-3 py-2 text-xs font-black text-coursia-primary hover:bg-coursia-primary/10" @click="startEdit">
              Modifier
            </button>
          </div>

          <div class="mt-4 overflow-hidden rounded-2xl bg-coursia-surface-muted">
            <img v-if="selectedImageUrl" :src="selectedImageUrl" :alt="selectedRecipe.title" class="h-44 w-full object-cover">
            <div v-else class="grid h-44 place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.18),transparent_30%),linear-gradient(135deg,#fff7ed,#eef7f2)] text-sm font-semibold text-coursia-muted dark:bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.18),transparent_30%),linear-gradient(135deg,#17231f,#111827)]">
              Aucun média publié
            </div>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Complétude</dt>
              <dd class="mt-1 text-lg font-black text-coursia-foreground">{{ selectedCompletion }}%</dd>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Coût estimé</dt>
              <dd class="mt-1 text-lg font-black text-coursia-foreground">{{ formatCurrency(selectedCost) }}</dd>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Portions</dt>
              <dd class="mt-1 text-lg font-black text-coursia-foreground">{{ selectedRecipe.portions ?? '—' }}</dd>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <dt class="text-xs font-bold text-coursia-muted">Mise à jour</dt>
              <dd class="mt-1 text-sm font-black text-coursia-foreground">{{ formatDate(selectedRecipe.updated_at) }}</dd>
            </div>
          </dl>

          <div class="mt-4">
            <h3 class="text-sm font-black text-coursia-foreground">Blocages publication</h3>
            <div v-if="selectedQualityIssues.length" class="mt-2 flex flex-wrap gap-2">
              <BaseBadge v-for="issue in selectedQualityIssues" :key="issue" tone="danger">{{ issue }}</BaseBadge>
            </div>
            <p v-else class="mt-2 rounded-2xl bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
              Aucun blocage détecté.
            </p>
          </div>

          <div class="mt-4 grid gap-2">
            <BaseButton type="button" variant="secondary" :disabled="actionPending === `duplicate:${selectedRecipe.id}`" @click="runRecipeAction(selectedRecipe, 'duplicate')">
              Dupliquer
            </BaseButton>
            <BaseButton type="button" variant="secondary" :disabled="actionPending === `submit-review:${selectedRecipe.id}` || selectedRecipe.status === 'review'" @click="runRecipeAction(selectedRecipe, 'submit-review')">
              Envoyer en validation
            </BaseButton>
            <BaseButton type="button" :disabled="actionPending === `publish:${selectedRecipe.id}` || selectedRecipe.status === 'published' || selectedQualityIssues.length > 0" @click="runRecipeAction(selectedRecipe, 'publish')">
              Publier
            </BaseButton>
            <BaseButton v-if="selectedRecipe.status === 'published'" type="button" variant="secondary" :disabled="actionPending === `unpublish:${selectedRecipe.id}`" @click="runRecipeAction(selectedRecipe, 'unpublish')">
              Dépublier
            </BaseButton>
            <BaseButton type="button" variant="ghost" :disabled="actionPending === `archive:${selectedRecipe.id}` || selectedRecipe.status === 'archived'" @click="runRecipeAction(selectedRecipe, 'archive')">
              Archiver
            </BaseButton>
            <BaseButton type="button" variant="ghost" :disabled="actionPending === `delete:${selectedRecipe.id}`" @click="deleteRecipe(selectedRecipe)">
              Supprimer définitivement
            </BaseButton>
          </div>
        </AdminPanel>

        <AdminPanel v-else>
          <AdminEmptyState
            icon="recipes"
            title="Sélectionne une recette"
            description="Le détail, les blocages de publication et les actions apparaîtront ici."
          />
        </AdminPanel>
      </aside>
    </div>

    <AdminPanel v-if="editorOpen">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Éditeur structuré</p>
          <h2 class="mt-1 text-xl font-black tracking-tight text-coursia-foreground">{{ editorTitle }}</h2>
          <p class="mt-1 text-sm text-coursia-muted">Les données enregistrées ici sont transformées vers la table mobile `recettes`.</p>
        </div>
        <div class="flex gap-2">
          <BaseButton type="button" variant="secondary" @click="closeEditor">
            Fermer
          </BaseButton>
          <BaseButton type="button" :disabled="saving" @click="saveRecipe">
            {{ primaryActionLabel }}
          </BaseButton>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 border-b border-coursia-border pb-3">
        <button
          v-for="tab in ['identity', 'ingredients', 'steps', 'quality'] as EditorTab[]"
          :key="tab"
          type="button"
          class="cursor-pointer rounded-xl px-3 py-2 text-sm font-black transition"
          :class="editorTab === tab ? 'bg-coursia-primary text-white' : 'bg-coursia-surface-muted text-coursia-muted hover:text-coursia-foreground'"
          @click="editorTab = tab"
        >
          {{ tabLabel[tab] }}
        </button>
      </div>

      <form class="mt-4" @submit.prevent="saveRecipe">
        <div v-if="editorTab === 'identity'" class="grid gap-4 lg:grid-cols-2">
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Titre
            <input v-model="form.title" required placeholder="One pot pasta aux légumes">
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Slug
            <input v-model="form.slug" required placeholder="one-pot-pasta-legumes">
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Statut
            <select v-model="form.status">
              <option value="draft">Brouillon</option>
              <option value="review">En validation</option>
              <option value="published">Publiée</option>
              <option value="archived">Archivée</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Difficulté
            <select v-model="form.difficulty">
              <option value="easy">Facile</option>
              <option value="medium">Moyenne</option>
              <option value="hard">Difficile</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Portions
            <input v-model.number="form.portions" type="number" min="1" max="24">
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Durée minutes
            <input v-model.number="form.durationMinutes" type="number" min="1" max="1440">
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground lg:col-span-2">
            Source
            <input v-model="form.source" placeholder="Création Coursia, adaptation, auteur...">
          </label>
          <section class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3 lg:col-span-2">
            <h3 class="text-sm font-black text-coursia-foreground">Catégories</h3>
            <div class="mt-3 flex gap-2">
              <input v-model="categoryInput" placeholder="rapide, végétarien..." @keydown.enter.prevent="addCategory">
              <BaseButton type="button" variant="secondary" @click="addCategory">Ajouter</BaseButton>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseBadge v-for="category in form.categories" :key="category" tone="neutral">
                <button type="button" class="cursor-pointer" @click="removeCategory(category)">{{ category }} ×</button>
              </BaseBadge>
              <span v-if="form.categories.length === 0" class="text-sm text-coursia-muted">Aucune catégorie.</span>
            </div>
          </section>
        </div>

        <div v-else-if="editorTab === 'ingredients'" class="grid gap-4">
          <section class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
            <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_110px_100px_160px_120px]">
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Ingrédient canonique
                <select v-model="ingredientDraft.ingredientId" @change="onIngredientChange">
                  <option value="">Sélectionner</option>
                  <option v-for="ingredient in ingredientCatalog" :key="ingredient.id" :value="ingredient.id">
                    {{ ingredient.name }}
                  </option>
                </select>
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Quantité
                <input v-model.number="ingredientDraft.quantity" type="number" min="0.01" step="0.01">
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Unité
                <select v-model="ingredientDraft.unit">
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="ml">ml</option>
                  <option value="l">l</option>
                  <option value="piece">pièce</option>
                  <option value="tbsp">cs</option>
                  <option value="tsp">cc</option>
                </select>
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Groupe
                <input v-model="ingredientDraft.group">
              </label>
              <div class="flex items-end">
                <BaseButton type="button" variant="secondary" @click="addIngredient">Ajouter</BaseButton>
              </div>
            </div>
            <label class="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-coursia-muted">
              <input v-model="ingredientDraft.optional" type="checkbox" class="h-4 w-4 accent-coursia-primary">
              Optionnel
            </label>
          </section>

          <div class="grid gap-2">
            <div
              v-for="(ingredient, index) in form.ingredients"
              :key="`${ingredient.ingredientId}-${index}`"
              class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coursia-border bg-coursia-surface p-3"
            >
              <div>
                <p class="font-black text-coursia-foreground">{{ ingredient.name }}</p>
                <p class="mt-1 text-xs text-coursia-muted">{{ ingredient.quantity }} {{ ingredient.unit }} · {{ ingredient.group }}{{ ingredient.optional ? ' · optionnel' : '' }}</p>
              </div>
              <div class="flex gap-1">
                <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted transition hover:bg-coursia-primary/10 hover:text-coursia-primary" @click="moveIngredient(index, -1)">↑</button>
                <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted transition hover:bg-coursia-primary/10 hover:text-coursia-primary" @click="moveIngredient(index, 1)">↓</button>
                <button type="button" class="rounded-lg px-2 py-1 text-xs font-black text-coursia-danger hover:bg-coursia-danger/10" @click="removeIngredient(index)">Retirer</button>
              </div>
            </div>
            <p v-if="form.ingredients.length === 0" class="rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">Aucun ingrédient.</p>
          </div>
        </div>

        <div v-else-if="editorTab === 'steps'" class="grid gap-4">
          <section class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Nouvelle étape
              <textarea v-model="stepInput" rows="3" placeholder="Décrire l’action de cuisine..." @keydown.ctrl.enter.prevent="addStep" />
            </label>
            <BaseButton class="mt-3" type="button" variant="secondary" @click="addStep">
              Ajouter l’étape
            </BaseButton>
          </section>

          <div class="grid gap-2">
            <div v-for="(step, index) in form.steps" :key="`${step.order}-${index}`" class="rounded-2xl border border-coursia-border bg-coursia-surface p-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex gap-3">
                  <span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-coursia-primary text-xs font-black text-white">{{ index + 1 }}</span>
                  <p class="text-sm leading-6 text-coursia-foreground">{{ step.instruction }}</p>
                </div>
                <div class="flex shrink-0 gap-1">
                  <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted transition hover:bg-coursia-primary/10 hover:text-coursia-primary" @click="moveStep(index, -1)">↑</button>
                  <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted transition hover:bg-coursia-primary/10 hover:text-coursia-primary" @click="moveStep(index, 1)">↓</button>
                  <button type="button" class="rounded-lg px-2 py-1 text-xs font-black text-coursia-danger hover:bg-coursia-danger/10" @click="removeStep(index)">Retirer</button>
                </div>
              </div>
            </div>
            <p v-if="form.steps.length === 0" class="rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">Aucune étape.</p>
          </div>
        </div>

        <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
            <h3 class="text-sm font-black text-coursia-foreground">Nutrition</h3>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Calories
                <input v-model.number="form.nutrition.calories" type="number" min="0">
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Protéines g
                <input v-model.number="form.nutrition.proteinGrams" type="number" min="0">
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Glucides g
                <input v-model.number="form.nutrition.carbsGrams" type="number" min="0">
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Lipides g
                <input v-model.number="form.nutrition.fatGrams" type="number" min="0">
              </label>
            </div>
          </section>

          <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4">
            <h3 class="text-sm font-black text-coursia-foreground">Checklist publication</h3>
            <div v-if="qualityIssues.length" class="mt-3 grid gap-2">
              <div v-for="issue in qualityIssues" :key="issue.key" class="rounded-xl bg-coursia-danger/10 px-3 py-2 text-sm font-semibold text-coursia-danger">
                {{ issue.label }}
              </div>
            </div>
            <p v-else class="mt-3 rounded-xl bg-coursia-success/10 px-3 py-2 text-sm font-semibold text-coursia-success">
              La recette est prête pour validation/publication.
            </p>
          </section>
        </div>
      </form>
    </AdminPanel>
  </section>
</template>
