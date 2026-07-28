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

const route = useRoute()
const router = useRouter()

const filters = reactive({
  search: '',
  status: typeof route.query.status === 'string' ? route.query.status : '',
  difficulty: '',
})

const recipes = ref<AdminRecipeRow[]>([])
const selectedRecipe = ref<AdminRecipeRow | null>(null)
const loading = ref(false)
const saving = ref(false)
const actionPending = ref('')
const feedback = ref('')
const editorMode = ref<'closed' | 'create' | 'edit'>('closed')

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

            <div class="rounded-2xl bg-[#fbf7f0] p-3 text-xs text-[#667085]">
              Les ingrédients et étapes restent conservés si tu modifies une recette existante. Le détail complet sera traité dans l’éditeur avancé.
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
