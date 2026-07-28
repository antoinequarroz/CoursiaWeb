<script setup lang="ts">
import type { OfficialRecipeMutation } from '#shared/validation/course'

definePageMeta({
  layout: 'admin',
})

type RecipeStatus = 'draft' | 'review' | 'published' | 'archived'
type RecipeDifficulty = 'easy' | 'medium' | 'hard'
type EditorTab = 'identity' | 'ingredients' | 'steps' | 'quality'

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

const statusLabel: Record<RecipeStatus, string> = {
  draft: 'Brouillon',
  review: 'En validation',
  published: 'Publiée',
  archived: 'Archivée',
}

const statusTone: Record<RecipeStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
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
      if (match) {
        await selectRecipe(match, false)
      }
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
  if (selectedRecipe.value) {
    fillForm(selectedRecipe.value)
  }
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
  if (response?.data) {
    selectedRecipe.value = response.data
  }
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
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">Catalogue officiel</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">Recettes</h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Back-office compact pour créer, contrôler et publier les recettes réellement utilisées par l’app mobile.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadRecipes">
          Rafraîchir
        </BaseButton>
        <NuxtLink to="/admin/recettes/import" class="ds-focus-ring inline-flex cursor-pointer items-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-foreground transition hover:bg-coursia-surface-muted">
          Import CSV
        </NuxtLink>
        <BaseButton type="button" @click="startCreate">
          Nouvelle recette
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="!filters.status ? 'ring-2 ring-coursia-primary/20' : ''" @click="applyStatusFilter('')">
        <span>Total</span>
        <strong>{{ stats.all }}</strong>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'published' ? 'ring-2 ring-coursia-success/25' : ''" @click="applyStatusFilter('published')">
        <span>Publiées</span>
        <strong class="text-coursia-success">{{ stats.published }}</strong>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'review' ? 'ring-2 ring-coursia-warning/25' : ''" @click="applyStatusFilter('review')">
        <span>À valider</span>
        <strong class="text-coursia-warning">{{ stats.review }}</strong>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'draft' ? 'ring-2 ring-coursia-muted/20' : ''" @click="applyStatusFilter('draft')">
        <span>Brouillons</span>
        <strong>{{ stats.draft }}</strong>
      </button>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]" @submit.prevent="loadRecipes">
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Nom ou slug..." />
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
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton type="button" variant="ghost" @click="clearFilters">Effacer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-2xl border border-coursia-border bg-coursia-surface px-4 py-3 text-sm font-semibold text-coursia-foreground shadow-coursia-sm">
      {{ feedback }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex items-center justify-between gap-4 border-b border-coursia-border px-4 py-3">
          <div>
            <h2 class="text-base font-black text-coursia-foreground">Catalogue</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ recipes.length }} recette(s) chargée(s)</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Live Supabase' }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-4 text-sm text-coursia-muted">
          Chargement des recettes...
        </div>

        <div v-else-if="recipes.length === 0" class="grid place-items-center p-10 text-center">
          <div class="max-w-sm">
            <p class="font-black text-coursia-foreground">Aucune recette trouvée</p>
            <p class="mt-2 text-sm text-coursia-muted">Aucun résultat ne correspond aux filtres actuels.</p>
            <BaseButton class="mt-4" type="button" @click="startCreate">Créer une recette</BaseButton>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-[58rem]">
            <thead>
              <tr>
                <th>Recette</th>
                <th>Statut</th>
                <th>Fiche</th>
                <th>Relations</th>
                <th>Coût</th>
                <th>MAJ</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="recipe in recipes"
                :key="recipe.id"
                class="cursor-pointer transition"
                :class="selectedRecipe?.id === recipe.id ? 'bg-coursia-primary/10 shadow-[inset_4px_0_0_var(--color-coursia-primary)]' : ''"
                @click="selectRecipe(recipe)"
              >
                <td>
                  <span class="block max-w-[20rem] truncate font-black text-coursia-foreground">{{ recipe.title || 'Recette sans titre' }}</span>
                  <span class="block max-w-[20rem] truncate text-xs text-coursia-muted">{{ recipe.slug }}</span>
                </td>
                <td>
                  <BaseBadge :tone="statusTone[recipe.status]">{{ statusLabel[recipe.status] }}</BaseBadge>
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ recipe.difficulty ? difficultyLabel[recipe.difficulty] : 'À compléter' }} · {{ recipe.duration_minutes ?? '—' }} min · {{ recipe.portions ?? '—' }} pers.
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ recipe.ingredients.length }} ing. · {{ recipe.steps.length }} étapes
                </td>
                <td>{{ formatCurrency(recipe.mobile?.estimatedCost) }}</td>
                <td>{{ formatDate(recipe.updated_at) }}</td>
                <td>
                  <div class="flex justify-end gap-2" @click.stop>
                    <BaseButton size="sm" variant="secondary" type="button" @click="selectRecipe(recipe).then(startEdit)">
                      Modifier
                    </BaseButton>
                    <BaseButton size="sm" variant="ghost" type="button" :disabled="actionPending === `duplicate:${recipe.id}`" @click="runRecipeAction(recipe, 'duplicate')">
                      Dupliquer
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
                {{ editingRecipeId ? 'Édition' : 'Création' }}
              </p>
              <h2 class="mt-1 text-lg font-black text-coursia-foreground">
                {{ editingRecipeId ? 'Modifier la recette' : 'Nouvelle recette' }}
              </h2>
            </div>
            <button type="button" class="cursor-pointer rounded-xl px-3 py-2 text-sm font-black text-coursia-muted transition hover:bg-coursia-surface-muted" @click="closeEditor">
              Fermer
            </button>
          </div>

          <div class="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-coursia-surface-muted p-1">
            <button
              v-for="tab in (['identity', 'ingredients', 'steps', 'quality'] as EditorTab[])"
              :key="tab"
              type="button"
              class="cursor-pointer rounded-xl px-2 py-2 text-xs font-black transition"
              :class="editorTab === tab ? 'bg-coursia-surface text-coursia-foreground shadow-coursia-sm' : 'text-coursia-muted hover:text-coursia-foreground'"
              @click="editorTab = tab"
            >
              {{ tabLabel[tab] }}
            </button>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="saveRecipe">
            <template v-if="editorTab === 'identity'">
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Titre
                <input v-model="form.title" required placeholder="Ex. One pot pasta aux légumes" />
              </label>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Slug
                <input v-model="form.slug" required placeholder="one-pot-pasta-legumes" />
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                  Portions
                  <input v-model.number="form.portions" type="number" min="1" max="24" />
                </label>
                <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                  Durée
                  <input v-model.number="form.durationMinutes" type="number" min="1" max="1440" />
                </label>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                  Difficulté
                  <select v-model="form.difficulty">
                    <option value="easy">Facile</option>
                    <option value="medium">Moyenne</option>
                    <option value="hard">Difficile</option>
                  </select>
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
              </div>
              <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
                Source
                <input v-model="form.source" placeholder="Auteur, source ou lien de référence" />
              </label>
            </template>

            <template v-else-if="editorTab === 'ingredients'">
              <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
                <div class="grid gap-2">
                  <select v-model="ingredientDraft.ingredientId" @change="onIngredientChange">
                    <option value="">Choisir un ingrédient</option>
                    <option v-for="ingredient in ingredientCatalog" :key="ingredient.id" :value="ingredient.id">
                      {{ ingredient.name }}
                    </option>
                  </select>
                  <div class="grid grid-cols-[1fr_1fr] gap-2">
                    <input v-model.number="ingredientDraft.quantity" type="number" min="0.01" step="0.01" placeholder="Quantité" />
                    <select v-model="ingredientDraft.unit">
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                      <option value="piece">pièce</option>
                      <option value="tbsp">c. soupe</option>
                      <option value="tsp">c. café</option>
                    </select>
                  </div>
                  <div class="grid grid-cols-[1fr_auto] gap-2">
                    <input v-model="ingredientDraft.group" placeholder="Groupe, ex. Sauce" />
                    <BaseButton type="button" variant="secondary" @click="addIngredient">Ajouter</BaseButton>
                  </div>
                </div>
              </div>

              <div class="grid gap-2">
                <article
                  v-for="(ingredient, index) in form.ingredients"
                  :key="`${ingredient.ingredientId}:${index}`"
                  class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3"
                >
                  <div class="grid gap-2">
                    <input v-model="ingredient.name" class="font-bold" />
                    <div class="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input v-model.number="ingredient.quantity" type="number" min="0.01" step="0.01" />
                      <select v-model="ingredient.unit">
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="piece">pièce</option>
                        <option value="tbsp">tbsp</option>
                        <option value="tsp">tsp</option>
                      </select>
                      <button type="button" class="cursor-pointer rounded-xl px-3 text-sm font-black text-coursia-danger hover:bg-coursia-danger/10" @click="removeIngredient(index)">
                        Retirer
                      </button>
                    </div>
                    <div class="flex gap-1">
                      <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted hover:bg-coursia-surface" @click="moveIngredient(index, -1)">↑</button>
                      <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted hover:bg-coursia-surface" @click="moveIngredient(index, 1)">↓</button>
                    </div>
                  </div>
                </article>
                <p v-if="form.ingredients.length === 0" class="rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
                  Aucun ingrédient ajouté.
                </p>
              </div>
            </template>

            <template v-else-if="editorTab === 'steps'">
              <div class="flex gap-2">
                <input v-model="stepInput" class="min-w-0 flex-1" placeholder="Ajouter une instruction..." @keyup.enter.prevent="addStep" />
                <BaseButton type="button" variant="secondary" @click="addStep">Ajouter</BaseButton>
              </div>
              <div class="grid gap-2">
                <article
                  v-for="(step, index) in form.steps"
                  :key="`${step.order}:${index}`"
                  class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3"
                >
                  <div class="flex items-start gap-3">
                    <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-coursia-primary/10 text-xs font-black text-coursia-primary">{{ index + 1 }}</span>
                    <textarea v-model="step.instruction" rows="3" class="min-w-0 flex-1 resize-none" />
                  </div>
                  <div class="mt-2 flex justify-end gap-1">
                    <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted hover:bg-coursia-surface" @click="moveStep(index, -1)">↑</button>
                    <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-muted hover:bg-coursia-surface" @click="moveStep(index, 1)">↓</button>
                    <button type="button" class="cursor-pointer rounded-lg px-2 py-1 text-xs font-black text-coursia-danger hover:bg-coursia-danger/10" @click="removeStep(index)">Retirer</button>
                  </div>
                </article>
                <p v-if="form.steps.length === 0" class="rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
                  Aucune étape ajoutée.
                </p>
              </div>
            </template>

            <template v-else>
              <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
                <p class="text-sm font-black text-coursia-foreground">Catégories</p>
                <div class="mt-3 flex gap-2">
                  <input v-model="categoryInput" class="min-w-0 flex-1" placeholder="Ajouter une catégorie..." @keyup.enter.prevent="addCategory" />
                  <BaseButton type="button" variant="secondary" @click="addCategory">Ajouter</BaseButton>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    v-for="category in form.categories"
                    :key="category"
                    type="button"
                    class="cursor-pointer rounded-full border border-coursia-border bg-coursia-surface px-3 py-1.5 text-xs font-bold text-coursia-foreground transition hover:border-coursia-primary"
                    @click="removeCategory(category)"
                  >
                    {{ category }} ×
                  </button>
                </div>
              </div>

              <div class="grid gap-2 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3 md:grid-cols-2">
                <label class="grid gap-1 text-xs font-bold text-coursia-foreground">
                  Calories
                  <input v-model.number="form.nutrition.calories" type="number" min="0" max="4000" />
                </label>
                <label class="grid gap-1 text-xs font-bold text-coursia-foreground">
                  Protéines (g)
                  <input v-model.number="form.nutrition.proteinGrams" type="number" min="0" max="500" step="0.1" />
                </label>
                <label class="grid gap-1 text-xs font-bold text-coursia-foreground">
                  Glucides (g)
                  <input v-model.number="form.nutrition.carbsGrams" type="number" min="0" max="800" step="0.1" />
                </label>
                <label class="grid gap-1 text-xs font-bold text-coursia-foreground">
                  Lipides (g)
                  <input v-model.number="form.nutrition.fatGrams" type="number" min="0" max="500" step="0.1" />
                </label>
              </div>

              <div class="rounded-2xl border p-3" :class="qualityIssues.length ? 'border-coursia-warning/30 bg-coursia-warning/10' : 'border-coursia-success/30 bg-coursia-success/10'">
                <p class="text-sm font-black text-coursia-foreground">
                  {{ qualityIssues.length ? 'À compléter avant publication' : 'Prête pour publication' }}
                </p>
                <ul v-if="qualityIssues.length" class="mt-2 grid gap-1 text-sm text-coursia-muted">
                  <li v-for="issue in qualityIssues" :key="issue.key">• {{ issue.label }}</li>
                </ul>
              </div>
            </template>

            <div class="flex flex-wrap gap-2 border-t border-coursia-border pt-4">
              <BaseButton type="submit" :disabled="saving">
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </BaseButton>
              <BaseButton type="button" variant="secondary" @click="closeEditor">Annuler</BaseButton>
            </div>
          </form>
        </section>

        <section v-else class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div v-if="!selectedRecipe" class="grid place-items-center rounded-2xl bg-coursia-surface-muted p-8 text-center">
            <div>
              <p class="font-black text-coursia-foreground">Sélectionne une recette</p>
              <p class="mt-2 text-sm text-coursia-muted">Le détail et les actions apparaîtront ici.</p>
            </div>
          </div>

          <template v-else>
            <div class="overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface-muted">
              <div v-if="selectedImageUrl" class="h-36 bg-cover bg-center" :style="{ backgroundImage: `url(${selectedImageUrl})` }" />
              <div v-else class="grid h-28 place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.16),transparent_34%),linear-gradient(135deg,rgba(15,45,39,0.08),transparent)]">
                <span class="text-xs font-black uppercase tracking-[0.16em] text-coursia-muted">Aucun visuel</span>
              </div>
              <div class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="truncate text-lg font-black text-coursia-foreground">{{ selectedRecipe.title }}</h2>
                    <p class="mt-1 truncate text-sm text-coursia-muted">{{ selectedRecipe.slug }}</p>
                  </div>
                  <BaseBadge :tone="statusTone[selectedRecipe.status]">{{ statusLabel[selectedRecipe.status] }}</BaseBadge>
                </div>

                <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div class="rounded-xl bg-coursia-surface p-3">
                    <dt class="text-xs font-bold text-coursia-muted">Durée</dt>
                    <dd class="mt-1 font-black text-coursia-foreground">{{ selectedRecipe.duration_minutes ?? '—' }} min</dd>
                  </div>
                  <div class="rounded-xl bg-coursia-surface p-3">
                    <dt class="text-xs font-bold text-coursia-muted">Portions</dt>
                    <dd class="mt-1 font-black text-coursia-foreground">{{ selectedRecipe.portions ?? '—' }}</dd>
                  </div>
                  <div class="rounded-xl bg-coursia-surface p-3">
                    <dt class="text-xs font-bold text-coursia-muted">Coût</dt>
                    <dd class="mt-1 font-black text-coursia-foreground">{{ formatCurrency(selectedCost) }}</dd>
                  </div>
                  <div class="rounded-xl bg-coursia-surface p-3">
                    <dt class="text-xs font-bold text-coursia-muted">Relations</dt>
                    <dd class="mt-1 font-black text-coursia-foreground">{{ selectedRecipe.ingredients.length }} / {{ selectedRecipe.steps.length }}</dd>
                  </div>
                </dl>

                <div class="mt-4 rounded-xl bg-coursia-surface p-3">
                  <p class="text-xs font-bold text-coursia-muted">Source</p>
                  <p class="mt-1 text-sm text-coursia-foreground">{{ selectedRecipe.source || 'Non renseignée' }}</p>
                </div>

                <div class="mt-4 rounded-xl border p-3" :class="selectedQualityIssues.length ? 'border-coursia-warning/30 bg-coursia-warning/10' : 'border-coursia-success/30 bg-coursia-success/10'">
                  <p class="text-sm font-black text-coursia-foreground">
                    {{ selectedQualityIssues.length ? 'Fiche incomplète' : 'Fiche complète' }}
                  </p>
                  <p class="mt-1 text-xs text-coursia-muted">
                    {{ selectedQualityIssues.length ? selectedQualityIssues.join(', ') : 'La recette peut être envoyée en validation ou publiée.' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="mt-4 grid gap-2">
              <BaseButton type="button" @click="startEdit">Modifier</BaseButton>
              <BaseButton type="button" variant="secondary" :disabled="actionPending === `submit-review:${selectedRecipe.id}` || selectedRecipe.status === 'review'" @click="runRecipeAction(selectedRecipe, 'submit-review')">
                Envoyer en validation
              </BaseButton>
              <BaseButton type="button" variant="secondary" :disabled="actionPending === `publish:${selectedRecipe.id}` || selectedRecipe.status === 'published'" @click="runRecipeAction(selectedRecipe, 'publish')">
                Publier
              </BaseButton>
              <BaseButton v-if="selectedRecipe.status === 'published'" type="button" variant="secondary" :disabled="actionPending === `unpublish:${selectedRecipe.id}`" @click="runRecipeAction(selectedRecipe, 'unpublish')">
                Dépublier
              </BaseButton>
              <BaseButton type="button" variant="ghost" :disabled="actionPending === `duplicate:${selectedRecipe.id}`" @click="runRecipeAction(selectedRecipe, 'duplicate')">
                Dupliquer en brouillon
              </BaseButton>
              <BaseButton type="button" variant="ghost" :disabled="actionPending === `archive:${selectedRecipe.id}` || selectedRecipe.status === 'archived'" @click="runRecipeAction(selectedRecipe, 'archive')">
                Archiver
              </BaseButton>
              <BaseButton type="button" variant="ghost" :disabled="actionPending === `delete:${selectedRecipe.id}`" @click="deleteRecipe(selectedRecipe)">
                Supprimer définitivement
              </BaseButton>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </section>
</template>
