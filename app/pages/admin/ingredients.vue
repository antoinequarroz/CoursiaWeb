<script setup lang="ts">
import type { CanonicalIngredientInput } from '#shared/validation/ingredient-catalog'

definePageMeta({
  layout: 'admin',
})

type IngredientUnit = CanonicalIngredientInput['units'][number]
type IngredientStatus = 'active' | 'archived'

type LinkedAllergen = {
  code: string
  label: string
  certainty: string | null
}

type IngredientRow = {
  id: string
  name: string
  slug: string
  status: IngredientStatus
  units: IngredientUnit[]
  categories: string[]
  allergens: string[]
  diets: string[]
  sensitive: boolean
  created_at?: string | null
  updated_at?: string | null
  archived_at?: string | null
  usage_count?: number
  linked_allergens?: LinkedAllergen[]
  mobile?: {
    table?: string
    name?: string
    aisle?: string | null
    defaultUnit?: string | null
  }
}

type IngredientForm = {
  name: string
  slug: string
  unit: IngredientUnit
  category: string
}

const unitOptions: Array<{ value: IngredientUnit, label: string }> = [
  { value: 'g', label: 'Grammes' },
  { value: 'kg', label: 'Kilogrammes' },
  { value: 'ml', label: 'Millilitres' },
  { value: 'l', label: 'Litres' },
  { value: 'piece', label: 'Pièce' },
  { value: 'tbsp', label: 'C. soupe' },
  { value: 'tsp', label: 'C. café' },
]

const categoryOptions = [
  'Fruits & Legumes',
  'Viandes',
  'Produits laitiers',
  'Epicerie',
  'Conserves',
  'Surgeles',
  'Boissons',
  'Hygiene',
]

const filters = reactive({
  search: '',
  status: '',
  category: '',
})

const ingredients = ref<IngredientRow[]>([])
const selectedIngredient = ref<IngredientRow | null>(null)
const editorOpen = ref(false)
const editingIngredientId = ref<string | null>(null)
const loading = ref(false)
const saving = ref(false)
const actionPending = ref('')
const feedback = ref('')
const errorMessage = ref('')

const form = reactive<IngredientForm>({
  name: '',
  slug: '',
  unit: 'g',
  category: '',
})

const ingredientQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 100 }

  if (filters.search.trim()) query.search = filters.search.trim()
  if (filters.status) query.status = filters.status

  return query
})

const visibleIngredients = computed(() => {
  if (!filters.category) return ingredients.value

  return ingredients.value.filter((ingredient) =>
    ingredient.categories.includes(filters.category)
    || ingredient.mobile?.aisle === filters.category,
  )
})

const stats = computed(() => ({
  total: ingredients.value.length,
  active: ingredients.value.filter((ingredient) => ingredient.status === 'active').length,
  archived: ingredients.value.filter((ingredient) => ingredient.status === 'archived').length,
  used: ingredients.value.filter((ingredient) => (ingredient.usage_count ?? 0) > 0).length,
}))

const selectedAllergens = computed(() => selectedIngredient.value?.linked_allergens ?? [])
const selectedUsageCount = computed(() => selectedIngredient.value?.usage_count ?? 0)

const activeFilterCount = computed(() =>
  [filters.search.trim(), filters.status, filters.category].filter(Boolean).length,
)

const statusLabel: Record<IngredientStatus, string> = {
  active: 'Actif',
  archived: 'Archivé',
}

const statusTone: Record<IngredientStatus, 'success' | 'neutral'> = {
  active: 'success',
  archived: 'neutral',
}

const toSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const formatDate = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Jamais'

const resetForm = () => {
  Object.assign(form, {
    name: '',
    slug: '',
    unit: 'g',
    category: '',
  })
}

const buildPayload = (): CanonicalIngredientInput => ({
  name: form.name,
  slug: form.slug,
  status: 'active',
  synonyms: [],
  units: [form.unit],
  categories: form.category ? [form.category] : [],
  allergens: [],
  diets: [],
  sensitive: false,
})

const loadIngredients = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: IngredientRow[] }>('/api/admin/ingredients', {
      query: ingredientQuery.value,
    })

    ingredients.value = response.data

    if (selectedIngredient.value) {
      selectedIngredient.value = ingredients.value.find((ingredient) => ingredient.id === selectedIngredient.value?.id) ?? null
    }

    if (!selectedIngredient.value && ingredients.value[0]) {
      selectedIngredient.value = ingredients.value[0]
    }
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Chargement impossible.'
  }
  finally {
    loading.value = false
  }
}

const selectIngredient = (ingredient: IngredientRow) => {
  selectedIngredient.value = ingredient
  editorOpen.value = false
  editingIngredientId.value = null
}

const startCreate = () => {
  selectedIngredient.value = null
  editingIngredientId.value = null
  resetForm()
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

const startEdit = () => {
  if (!selectedIngredient.value) return

  const ingredient = selectedIngredient.value
  editingIngredientId.value = ingredient.id
  Object.assign(form, {
    name: ingredient.name,
    slug: ingredient.slug,
    unit: ingredient.units[0] ?? 'g',
    category: ingredient.categories[0] ?? ingredient.mobile?.aisle ?? '',
  })
  editorOpen.value = true
  feedback.value = ''
  errorMessage.value = ''
}

const closeEditor = () => {
  editorOpen.value = false
  editingIngredientId.value = null
  resetForm()
}

const saveIngredient = async () => {
  saving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const endpoint = editingIngredientId.value
      ? `/api/admin/ingredients/${editingIngredientId.value}`
      : '/api/admin/ingredients'
    const method = editingIngredientId.value ? 'PUT' : 'POST'

    const response = await $fetch<{ data: IngredientRow }>(endpoint, {
      method,
      body: buildPayload(),
    })

    feedback.value = editingIngredientId.value ? 'Ingrédient modifié.' : 'Ingrédient créé.'
    selectedIngredient.value = response.data
    editorOpen.value = false
    editingIngredientId.value = null
    await loadIngredients()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  }
  finally {
    saving.value = false
  }
}

const archiveIngredient = async (ingredient: IngredientRow) => {
  if (!confirm(`Archiver « ${ingredient.name} » ?`)) return

  actionPending.value = `archive:${ingredient.id}`
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: IngredientRow }>(`/api/admin/ingredients/${ingredient.id}/archive`, {
      method: 'POST',
    })

    feedback.value = 'Ingrédient archivé.'
    selectedIngredient.value = response.data
    await loadIngredients()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Archivage impossible.'
  }
  finally {
    actionPending.value = ''
  }
}

const clearFilters = async () => {
  filters.search = ''
  filters.status = ''
  filters.category = ''
  await loadIngredients()
}

watch(
  () => form.name,
  (name) => {
    if (!editingIngredientId.value && !form.slug) {
      form.slug = toSlug(name)
    }
  },
)

onMounted(loadIngredients)
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">Référentiel alimentaire</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
          Ingrédients
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Catalogue canonique utilisé par les recettes, les listes de courses et la correspondance produits.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadIngredients">
          Rafraîchir
        </BaseButton>
        <BaseButton type="button" @click="startCreate">
          Nouvel ingrédient
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="!filters.status ? 'ring-2 ring-coursia-primary/20' : ''" @click="filters.status = ''; loadIngredients()">
        <span>Total</span>
        <strong>{{ stats.total }}</strong>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'active' ? 'ring-2 ring-coursia-success/25' : ''" @click="filters.status = 'active'; loadIngredients()">
        <span>Actifs</span>
        <strong class="text-coursia-success">{{ stats.active }}</strong>
      </button>
      <button type="button" class="admin-stat-card cursor-pointer text-left" :class="filters.status === 'archived' ? 'ring-2 ring-coursia-muted/20' : ''" @click="filters.status = 'archived'; loadIngredients()">
        <span>Archivés</span>
        <strong>{{ stats.archived }}</strong>
      </button>
      <article class="admin-stat-card">
        <span>Utilisés</span>
        <strong class="text-coursia-primary">{{ stats.used }}</strong>
      </article>
    </div>

    <form class="admin-toolbar grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto]" @submit.prevent="loadIngredients">
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Nom ou rayon..." />
      </label>
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
        Rayon
        <select v-model="filters.category">
          <option value="">Tous</option>
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </select>
      </label>
      <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
        Statut
        <select v-model="filters.status">
          <option value="">Tous</option>
          <option value="active">Actif</option>
          <option value="archived">Archivé</option>
        </select>
      </label>
      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="loading">Appliquer</BaseButton>
        <BaseButton v-if="activeFilterCount" type="button" variant="ghost" @click="clearFilters">Effacer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex items-center justify-between gap-4 border-b border-coursia-border px-4 py-3">
          <div>
            <h2 class="text-base font-black text-coursia-foreground">Catalogue</h2>
            <p class="mt-1 text-xs text-coursia-muted">{{ visibleIngredients.length }} ingrédient(s) affiché(s)</p>
          </div>
          <BaseBadge tone="neutral">{{ loading ? 'Chargement' : 'Live Supabase' }}</BaseBadge>
        </div>

        <div v-if="loading" class="p-4 text-sm text-coursia-muted">
          Chargement du catalogue...
        </div>

        <div v-else-if="visibleIngredients.length === 0" class="grid place-items-center p-10 text-center">
          <div class="max-w-sm">
            <p class="font-black text-coursia-foreground">Aucun ingrédient trouvé</p>
            <p class="mt-2 text-sm text-coursia-muted">Aucun résultat ne correspond aux filtres actuels.</p>
            <div class="mt-4 flex justify-center gap-2">
              <BaseButton v-if="activeFilterCount" type="button" variant="secondary" @click="clearFilters">
                Réinitialiser
              </BaseButton>
              <BaseButton type="button" @click="startCreate">Créer</BaseButton>
            </div>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-[52rem]">
            <thead>
              <tr>
                <th>Ingrédient</th>
                <th>Rayon</th>
                <th>Unité</th>
                <th>Usage</th>
                <th>Allergènes liés</th>
                <th>Statut</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ingredient in visibleIngredients"
                :key="ingredient.id"
                class="cursor-pointer transition"
                :class="selectedIngredient?.id === ingredient.id ? 'bg-coursia-primary/10 shadow-[inset_4px_0_0_var(--color-coursia-primary)]' : ''"
                @click="selectIngredient(ingredient)"
              >
                <td>
                  <span class="block max-w-[18rem] truncate font-black text-coursia-foreground">{{ ingredient.name }}</span>
                  <span class="mt-1 block max-w-[18rem] truncate text-xs text-coursia-muted">{{ ingredient.slug }}</span>
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ ingredient.categories[0] ?? ingredient.mobile?.aisle ?? '—' }}
                </td>
                <td class="text-sm text-coursia-muted">
                  {{ ingredient.units.join(', ') || '—' }}
                </td>
                <td>
                  <BaseBadge :tone="(ingredient.usage_count ?? 0) > 0 ? 'primary' : 'neutral'">
                    {{ ingredient.usage_count ?? 0 }} recette(s)
                  </BaseBadge>
                </td>
                <td>
                  <div class="flex max-w-[16rem] flex-wrap gap-1.5">
                    <BaseBadge
                      v-for="allergen in ingredient.linked_allergens?.slice(0, 2)"
                      :key="`${ingredient.id}-${allergen.code}`"
                      tone="danger"
                    >
                      {{ allergen.label }}
                    </BaseBadge>
                    <span v-if="!ingredient.linked_allergens?.length" class="text-xs text-coursia-muted">Aucun</span>
                  </div>
                </td>
                <td>
                  <BaseBadge :tone="statusTone[ingredient.status]">
                    {{ statusLabel[ingredient.status] }}
                  </BaseBadge>
                </td>
                <td @click.stop>
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="secondary" type="button" @click="selectIngredient(ingredient); startEdit()">
                      Modifier
                    </BaseButton>
                    <BaseButton
                      size="sm"
                      variant="ghost"
                      type="button"
                      :disabled="ingredient.status === 'archived' || actionPending === `archive:${ingredient.id}`"
                      @click="archiveIngredient(ingredient)"
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

      <aside class="grid gap-4">
        <section v-if="editorOpen" class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">
                {{ editingIngredientId ? 'Modification' : 'Création' }}
              </p>
              <h2 class="mt-1 text-lg font-black text-coursia-foreground">Fiche ingrédient</h2>
            </div>
            <button type="button" class="cursor-pointer rounded-xl px-3 py-2 text-sm font-black text-coursia-muted transition hover:bg-coursia-surface-muted" @click="closeEditor">
              Fermer
            </button>
          </div>

          <form class="mt-4 grid gap-4" @submit.prevent="saveIngredient">
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Nom
              <input v-model="form.name" required placeholder="Ex. Tomate" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Slug
              <input v-model="form.slug" required placeholder="tomate" />
            </label>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Rayon
              <select v-model="form.category">
                <option value="">Non classé</option>
                <option v-for="category in categoryOptions" :key="category" :value="category">
                  {{ category }}
                </option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
              Unité par défaut
              <select v-model="form.unit">
                <option v-for="unit in unitOptions" :key="unit.value" :value="unit.value">
                  {{ unit.value }} · {{ unit.label }}
                </option>
              </select>
            </label>

            <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-black text-coursia-foreground">Périmètre actuel</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">
                Cette sauvegarde met à jour les champs branchés aujourd’hui sur la table mobile :
                nom, rayon et unité par défaut. Les synonymes, régimes et règles avancées d’allergènes
                seront à traiter dans une passe dédiée.
              </p>
            </div>

            <div class="flex flex-wrap gap-2 border-t border-coursia-border pt-4">
              <BaseButton type="submit" :disabled="saving">
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </BaseButton>
              <BaseButton type="button" variant="secondary" @click="closeEditor">Annuler</BaseButton>
            </div>
          </form>
        </section>

        <section v-else class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div v-if="!selectedIngredient" class="grid place-items-center rounded-2xl bg-coursia-surface-muted p-8 text-center">
            <div>
              <p class="font-black text-coursia-foreground">Sélectionne un ingrédient</p>
              <p class="mt-2 text-sm text-coursia-muted">Le détail et les actions apparaîtront ici.</p>
            </div>
          </div>

          <template v-else>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h2 class="truncate text-lg font-black text-coursia-foreground">{{ selectedIngredient.name }}</h2>
                <p class="mt-1 truncate text-sm text-coursia-muted">{{ selectedIngredient.slug }}</p>
              </div>
              <BaseBadge :tone="statusTone[selectedIngredient.status]">
                {{ statusLabel[selectedIngredient.status] }}
              </BaseBadge>
            </div>

            <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-bold text-coursia-muted">Rayon</dt>
                <dd class="mt-1 font-black text-coursia-foreground">{{ selectedIngredient.categories[0] ?? selectedIngredient.mobile?.aisle ?? '—' }}</dd>
              </div>
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-bold text-coursia-muted">Unité</dt>
                <dd class="mt-1 font-black text-coursia-foreground">{{ selectedIngredient.units.join(', ') || '—' }}</dd>
              </div>
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-bold text-coursia-muted">Usage recettes</dt>
                <dd class="mt-1 font-black text-coursia-foreground">{{ selectedUsageCount }}</dd>
              </div>
              <div class="rounded-xl bg-coursia-surface-muted p-3">
                <dt class="text-xs font-bold text-coursia-muted">Dernière MAJ</dt>
                <dd class="mt-1 font-black text-coursia-foreground">{{ formatDate(selectedIngredient.updated_at) }}</dd>
              </div>
            </dl>

            <div class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-black text-coursia-foreground">Allergènes liés</p>
                <BaseBadge :tone="selectedAllergens.length ? 'danger' : 'neutral'">{{ selectedAllergens.length }}</BaseBadge>
              </div>
              <div v-if="selectedAllergens.length" class="mt-3 grid gap-2">
                <div
                  v-for="allergen in selectedAllergens"
                  :key="allergen.code"
                  class="flex items-center justify-between gap-3 rounded-xl bg-coursia-surface px-3 py-2 text-sm"
                >
                  <span class="font-bold text-coursia-foreground">{{ allergen.label }}</span>
                  <span class="text-xs text-coursia-muted">{{ allergen.certainty ?? 'certitude inconnue' }}</span>
                </div>
              </div>
              <p v-else class="mt-3 text-sm text-coursia-muted">
                Aucun allergène lié dans le référentiel actuel.
              </p>
            </div>

            <div class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="text-sm font-black text-coursia-foreground">Impact mobile</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">
                Modifier cet ingrédient peut affecter les recettes, les quantités et la correspondance avec les produits magasins.
              </p>
            </div>

            <div class="mt-4 grid gap-2">
              <BaseButton type="button" @click="startEdit">Modifier</BaseButton>
              <BaseButton
                type="button"
                variant="secondary"
                :disabled="selectedIngredient.status === 'archived' || actionPending === `archive:${selectedIngredient.id}`"
                @click="archiveIngredient(selectedIngredient)"
              >
                Archiver
              </BaseButton>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </section>
</template>
