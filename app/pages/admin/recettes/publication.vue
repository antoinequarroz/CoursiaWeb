<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type RecipeStatus = 'draft' | 'review' | 'published' | 'archived'
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type RecipeOption = {
  id: string
  title: string
  slug: string
  status: RecipeStatus
  portions?: number | null
  duration_minutes?: number | null
  difficulty?: string | null
  source?: string | null
  updated_at?: string | null
}

type RecipePreviewResponse = {
  data?: RecipeOption
  behavior?: string
  preview?: {
    blockingFields: string[]
    mobile: {
      title: string
      subtitle: string
      status: string
      meta: {
        portions: number | null
        durationMinutes: number | null
        difficulty: string | null
      }
      ingredients: unknown[]
      steps: unknown[]
    }
    web: {
      title: string
      slug: string
      source: string | null
      categories: string[]
      status: string
    }
  }
}

const recipeId = ref('')
const reason = ref('')
const feedback = ref('')
const errorMessage = ref('')
const loading = ref(false)
const loadingRecipes = ref(true)
const preview = ref<RecipePreviewResponse['preview'] | null>(null)
const recipe = ref<RecipePreviewResponse['data'] | null>(null)
const recipes = ref<RecipeOption[]>([])
const actionPending = ref<'submit-review' | 'publish' | 'unpublish' | 'archive' | ''>('')

const statusLabels: Record<RecipeStatus, string> = {
  draft: 'Brouillon',
  review: 'En validation',
  published: 'Publiée',
  archived: 'Archivée',
}

const statusDescriptions: Record<RecipeStatus, string> = {
  draft: 'Modifiable librement, invisible côté app.',
  review: 'En contrôle éditorial avant publication.',
  published: 'Disponible pour les surfaces mobiles et web.',
  archived: 'Retirée du catalogue actif, conservée pour historique.',
}

const blockingLabels: Record<string, string> = {
  title: 'Titre manquant',
  slug: 'Slug technique manquant',
  portions: 'Nombre de portions manquant',
  durationMinutes: 'Durée de préparation manquante',
  difficulty: 'Difficulté manquante',
  ingredients: 'Aucun ingrédient structuré',
  steps: 'Aucune étape de préparation',
  source: 'Source ou origine manquante',
}

const workflowSteps: Array<{ value: RecipeStatus; label: string }> = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'review', label: 'Validation' },
  { value: 'published', label: 'Publication' },
  { value: 'archived', label: 'Archive' },
]
const unpublishBehaviorMessage =
  'La recette dépubliée disparaît des listes publiques et reste disponible dans l’administration en brouillon.'

const statusTone = (status?: string | null): BadgeTone => {
  if (status === 'published') return 'success'
  if (status === 'review') return 'warning'
  if (status === 'archived') return 'neutral'

  return 'primary'
}

const selectedRecipeOption = computed(() =>
  recipes.value.find((item) => item.id === recipeId.value) ?? null,
)
const blockingFields = computed(() => preview.value?.blockingFields ?? [])
const blockingCount = computed(() => blockingFields.value.length)
const canPublish = computed(() => Boolean(recipe.value) && blockingCount.value === 0 && recipe.value?.status !== 'archived')
const ingredientCount = computed(() => preview.value?.mobile.ingredients.length ?? 0)
const stepCount = computed(() => preview.value?.mobile.steps.length ?? 0)
const activeStepIndex = computed(() =>
  workflowSteps.findIndex((step) => step.value === (recipe.value?.status ?? selectedRecipeOption.value?.status)),
)
const selectedRecipeLabel = computed(() => {
  const selected = selectedRecipeOption.value

  return selected ? `${selected.title || 'Recette sans titre'} · ${statusLabels[selected.status]}` : 'Aucune recette sélectionnée'
})
const formattedUpdatedAt = computed(() => {
  const value = recipe.value?.updated_at ?? selectedRecipeOption.value?.updated_at
  if (!value) return 'Non disponible'

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
})

const blockingLabel = (field: string) => blockingLabels[field] ?? field

const loadRecipes = async () => {
  loadingRecipes.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: RecipeOption[] }>('/api/admin/recipes', {
      query: { limit: 100 },
    })
    recipes.value = response.data

    if (!recipeId.value && recipes.value.length > 0) {
      recipeId.value = recipes.value[0]?.id ?? ''
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les recettes.'
  } finally {
    loadingRecipes.value = false
  }
}

const loadPreview = async () => {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Sélectionne une recette.'
    return
  }

  loading.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<RecipePreviewResponse>(`/api/admin/recipes/${recipeId.value.trim()}/preview`)
    recipe.value = response.data ?? null
    preview.value = response.preview ?? null
    feedback.value = 'Aperçu mobile et web chargé.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger l’aperçu.'
  } finally {
    loading.value = false
  }
}

const refreshAfterMutation = async (response: RecipePreviewResponse) => {
  recipe.value = response.data ?? recipe.value
  preview.value = response.preview ?? preview.value
  await loadRecipes()
}

const runAction = async (action: 'submit-review' | 'publish' | 'unpublish') => {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Sélectionne une recette.'
    return
  }

  loading.value = true
  actionPending.value = action
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<RecipePreviewResponse>(
      `/api/admin/recipes/${recipeId.value.trim()}/${action}`,
      {
        method: 'POST',
        body: { reason: reason.value || undefined },
      },
    )

    await refreshAfterMutation(response)
    feedback.value = response.behavior ?? 'Workflow de publication mis à jour et historisé.'
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Action refusée : vérifie les champs bloquants et les droits.'
  } finally {
    actionPending.value = ''
    loading.value = false
  }
}

const archiveRecipe = async () => {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Sélectionne une recette.'
    return
  }

  loading.value = true
  actionPending.value = 'archive'
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<RecipePreviewResponse>(
      `/api/admin/recipes/${recipeId.value.trim()}/archive`,
      { method: 'POST' },
    )
    recipe.value = response.data ?? recipe.value
    preview.value = response.preview ?? null
    await loadRecipes()
    feedback.value = 'Recette archivée et retirée du catalogue actif.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’archiver la recette.'
  } finally {
    actionPending.value = ''
    loading.value = false
  }
}

watch(recipeId, () => {
  preview.value = null
  feedback.value = ''
  errorMessage.value = ''
  recipe.value = selectedRecipeOption.value
    ? { ...selectedRecipeOption.value }
    : null
})

onMounted(() => {
  void loadRecipes()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-101</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
          Publication des recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Contrôle les champs bloquants, l’aperçu mobile/web et les transitions avant de rendre une recette disponible.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <BaseBadge :tone="statusTone(recipe?.status)">
          {{ recipe ? statusLabels[recipe.status] : 'Aucune recette' }}
        </BaseBadge>
        <BaseButton type="button" variant="secondary" :disabled="loading || !recipeId" @click="loadPreview">
          Actualiser l’aperçu
        </BaseButton>
      </div>
    </div>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <form class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm" @submit.prevent="loadPreview">
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
        <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
          Recette
          <select v-model="recipeId" :disabled="loadingRecipes">
            <option value="">{{ loadingRecipes ? 'Chargement...' : 'Sélectionner une recette' }}</option>
            <option v-for="item in recipes" :key="item.id" :value="item.id">
              {{ item.title || 'Recette sans titre' }} · {{ statusLabels[item.status] }}
            </option>
          </select>
          <span class="truncate text-xs font-medium text-coursia-muted">{{ selectedRecipeLabel }}</span>
        </label>

        <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
          Note d’historique
          <input v-model="reason" placeholder="Validation finale, correction, dépublication...">
          <span class="text-xs font-medium text-coursia-muted">Optionnel, enregistré dans l’historique de publication.</span>
        </label>

        <BaseButton class="self-start lg:self-end" type="submit" :disabled="loading || !recipeId">
          {{ loading ? 'Chargement...' : 'Charger' }}
        </BaseButton>
      </div>
    </form>

    <div class="grid gap-3 md:grid-cols-4">
      <article class="admin-stat-card">
        <span>Statut actuel</span>
        <strong>{{ recipe ? statusLabels[recipe.status] : '—' }}</strong>
        <small>{{ recipe?.slug || 'Aucune recette chargée' }}</small>
      </article>
      <article class="admin-stat-card">
        <span>Bloquants</span>
        <strong :class="blockingCount ? 'text-coursia-danger' : 'text-coursia-success'">{{ blockingCount }}</strong>
        <small>{{ blockingCount ? 'à corriger' : 'prête côté checklist' }}</small>
      </article>
      <article class="admin-stat-card">
        <span>Structure mobile</span>
        <strong>{{ ingredientCount }} / {{ stepCount }}</strong>
        <small>ingrédients / étapes</small>
      </article>
      <article class="admin-stat-card">
        <span>Dernière mise à jour</span>
        <strong class="text-base">{{ formattedUpdatedAt }}</strong>
        <small>source : table recettes</small>
      </article>
    </div>

    <div class="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside class="grid gap-4">
        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-black text-coursia-foreground">Cycle de publication</h2>
              <p class="mt-1 text-xs text-coursia-muted">Le statut écrit dans Supabase est celui que l’app doit consommer.</p>
            </div>
            <BaseBadge tone="neutral">recettes.statut_publication</BaseBadge>
          </div>

          <div class="mt-4 grid gap-3">
            <div
              v-for="(step, index) in workflowSteps"
              :key="step.value"
              class="relative rounded-2xl border p-3 transition"
              :class="[
                recipe?.status === step.value
                  ? 'border-coursia-primary/30 bg-coursia-primary/10'
                  : 'border-coursia-border bg-coursia-surface-muted',
              ]"
            >
              <div class="flex items-start gap-3">
                <span
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-xs font-black"
                  :class="index <= activeStepIndex ? 'border-coursia-primary bg-coursia-primary text-white' : 'border-coursia-border bg-coursia-surface text-coursia-muted'"
                >
                  {{ index + 1 }}
                </span>
                <div>
                  <p class="font-black text-coursia-foreground">{{ step.label }}</p>
                  <p class="mt-1 text-xs leading-5 text-coursia-muted">{{ statusDescriptions[step.value] }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-black text-coursia-foreground">Actions</h2>
          <div class="mt-4 grid gap-2">
            <BaseButton type="button" variant="secondary" :disabled="loading || !recipeId || recipe?.status === 'review'" @click="runAction('submit-review')">
              {{ actionPending === 'submit-review' ? 'Envoi...' : 'Envoyer en validation' }}
            </BaseButton>
            <BaseButton type="button" :disabled="loading || !canPublish || recipe?.status === 'published'" @click="runAction('publish')">
              {{ actionPending === 'publish' ? 'Publication...' : 'Publier' }}
            </BaseButton>
            <BaseButton type="button" variant="secondary" :disabled="loading || !recipeId || recipe?.status !== 'published'" @click="runAction('unpublish')">
              {{ actionPending === 'unpublish' ? 'Dépublication...' : 'Dépublier' }}
            </BaseButton>
            <BaseButton type="button" variant="ghost" :disabled="loading || !recipeId || recipe?.status === 'archived'" @click="archiveRecipe">
              {{ actionPending === 'archive' ? 'Archivage...' : 'Archiver' }}
            </BaseButton>
          </div>
          <p class="mt-4 rounded-2xl bg-coursia-surface-muted p-3 text-xs leading-5 text-coursia-muted">
            {{ unpublishBehaviorMessage }}
          </p>
        </section>
      </aside>

      <section class="grid gap-4">
        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-black text-coursia-foreground">Checklist bloquante</h2>
              <p class="mt-1 text-xs text-coursia-muted">La publication reste désactivée tant que cette liste n’est pas vide.</p>
            </div>
            <BaseBadge :tone="blockingCount === 0 ? 'success' : 'danger'">
              {{ blockingCount === 0 ? 'Prête' : `${blockingCount} corrections` }}
            </BaseBadge>
          </div>

          <div v-if="blockingFields.length" class="mt-4 grid gap-2 sm:grid-cols-2">
            <div
              v-for="field in blockingFields"
              :key="field"
              class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger"
            >
              {{ blockingLabel(field) }}
            </div>
          </div>
          <div v-else class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-4 text-sm font-semibold text-coursia-success">
            Aucun champ bloquant détecté pour l’aperçu chargé.
          </div>
        </article>

        <div class="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
          <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Mobile</p>
                <h2 class="mt-1 text-base font-black text-coursia-foreground">Fiche app</h2>
              </div>
              <BaseBadge :tone="statusTone(preview?.mobile.status ?? recipe?.status)">
                {{ preview?.mobile.status ?? recipe?.status ?? 'draft' }}
              </BaseBadge>
            </div>

            <div class="mx-auto mt-4 max-w-[260px] rounded-[2rem] border border-coursia-foreground bg-coursia-foreground p-2 shadow-coursia-md">
              <div class="overflow-hidden rounded-[1.55rem] bg-coursia-surface">
                <div class="h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(255,122,89,0.35),transparent_30%),linear-gradient(135deg,#fdf2e7,#eaf5ee)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(255,122,89,0.25),transparent_30%),linear-gradient(135deg,#18251f,#0f172a)]" />
                <div class="p-4">
                  <h3 class="text-lg font-black leading-tight text-coursia-foreground">
                    {{ preview?.mobile.title ?? recipe?.title ?? 'Titre recette' }}
                  </h3>
                  <p class="mt-2 min-h-5 text-xs text-coursia-muted">{{ preview?.mobile.subtitle || 'Catégories à compléter' }}</p>
                  <div class="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-coursia-foreground">
                    <span class="rounded-xl bg-coursia-surface-muted px-2 py-2">{{ preview?.mobile.meta.portions ?? '-' }} pers.</span>
                    <span class="rounded-xl bg-coursia-surface-muted px-2 py-2">{{ preview?.mobile.meta.durationMinutes ?? '-' }} min</span>
                    <span class="rounded-xl bg-coursia-surface-muted px-2 py-2">{{ preview?.mobile.meta.difficulty ?? '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Web</p>
                <h2 class="mt-1 text-base font-black text-coursia-foreground">Aperçu public</h2>
              </div>
              <BaseBadge :tone="statusTone(preview?.web.status ?? recipe?.status)">
                {{ preview?.web.status ?? recipe?.status ?? 'draft' }}
              </BaseBadge>
            </div>

            <div class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
              <h3 class="text-2xl font-black tracking-tight text-coursia-foreground">
                {{ preview?.web.title ?? recipe?.title ?? 'Titre recette' }}
              </h3>
              <p class="mt-2 text-sm text-coursia-muted">/{{ preview?.web.slug ?? recipe?.slug ?? 'slug-recette' }}</p>

              <dl class="mt-5 grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl bg-coursia-surface p-3">
                  <dt class="text-xs font-bold text-coursia-muted">Source</dt>
                  <dd class="mt-1 truncate text-sm font-black text-coursia-foreground">{{ preview?.web.source ?? recipe?.source ?? 'À compléter' }}</dd>
                </div>
                <div class="rounded-2xl bg-coursia-surface p-3">
                  <dt class="text-xs font-bold text-coursia-muted">Ingrédients</dt>
                  <dd class="mt-1 text-sm font-black text-coursia-foreground">{{ ingredientCount }}</dd>
                </div>
                <div class="rounded-2xl bg-coursia-surface p-3">
                  <dt class="text-xs font-bold text-coursia-muted">Étapes</dt>
                  <dd class="mt-1 text-sm font-black text-coursia-foreground">{{ stepCount }}</dd>
                </div>
              </dl>

              <div class="mt-5 flex flex-wrap gap-2">
                <BaseBadge v-for="category in preview?.web.categories ?? []" :key="category" tone="neutral">
                  {{ category }}
                </BaseBadge>
                <span v-if="!(preview?.web.categories?.length)" class="text-sm text-coursia-muted">
                  Aucune catégorie visible pour le moment.
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
