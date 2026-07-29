<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type RecipeStatus = 'draft' | 'review' | 'published' | 'archived'
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
type WorkflowAction = 'submit-review' | 'publish' | 'unpublish' | 'archive'

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

const route = useRoute()
const router = useRouter()

const recipeId = ref(typeof route.query.recipeId === 'string' ? route.query.recipeId : '')
const reason = ref('')
const feedback = ref('')
const errorMessage = ref('')
const loading = ref(false)
const loadingRecipes = ref(true)
const preview = ref<RecipePreviewResponse['preview'] | null>(null)
const recipe = ref<RecipePreviewResponse['data'] | null>(null)
const recipes = ref<RecipeOption[]>([])
const actionPending = ref<WorkflowAction | ''>('')

const statusLabels: Record<RecipeStatus, string> = {
  draft: 'Brouillon',
  review: 'En validation',
  published: 'Publiée',
  archived: 'Archivée',
}

const statusDescriptions: Record<RecipeStatus, string> = {
  draft: 'Modifiable dans l’admin, invisible côté application.',
  review: 'Prête pour contrôle éditorial avant publication.',
  published: 'Visible sur les surfaces mobiles et web.',
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

const workflowSteps: Array<{ value: RecipeStatus, label: string }> = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'review', label: 'Validation' },
  { value: 'published', label: 'Publication' },
  { value: 'archived', label: 'Archive' },
]

const unpublishBehaviorMessage =
  'Une recette dépubliée disparaît des listes publiques et reste disponible dans l’administration en brouillon.'

const selectedRecipeOption = computed(() =>
  recipes.value.find((item) => item.id === recipeId.value) ?? null,
)
const loadedStatus = computed(() => recipe.value?.status ?? selectedRecipeOption.value?.status ?? null)
const blockingFields = computed(() => preview.value?.blockingFields ?? [])
const blockingCount = computed(() => blockingFields.value.length)
const ingredientCount = computed(() => preview.value?.mobile.ingredients.length ?? 0)
const stepCount = computed(() => preview.value?.mobile.steps.length ?? 0)
const isPreviewLoaded = computed(() => Boolean(preview.value))
const canPublish = computed(() => Boolean(recipe.value) && blockingCount.value === 0 && recipe.value?.status !== 'archived')
const activeStepIndex = computed(() =>
  Math.max(0, workflowSteps.findIndex((step) => step.value === loadedStatus.value)),
)
const selectedRecipeLabel = computed(() => {
  const selected = selectedRecipeOption.value
  return selected ? `${selected.title || 'Recette sans titre'} · ${statusLabels[selected.status]}` : 'Aucune recette sélectionnée'
})
const formattedUpdatedAt = computed(() => formatDateTime(recipe.value?.updated_at ?? selectedRecipeOption.value?.updated_at))
const currentStatusLabel = computed(() => loadedStatus.value ? statusLabels[loadedStatus.value] : '—')
const readinessLabel = computed(() => {
  if (!isPreviewLoaded.value) return 'Aperçu requis'
  if (blockingCount.value > 0) return `${blockingCount.value} correction(s)`
  return 'Prête'
})

const overviewStats = computed(() => [
  {
    label: 'Statut',
    value: currentStatusLabel.value,
    detail: recipe.value?.slug || selectedRecipeOption.value?.slug || 'Aucune recette chargée',
    tone: statusTone(loadedStatus.value),
  },
  {
    label: 'Publication',
    value: readinessLabel.value,
    detail: isPreviewLoaded.value ? 'aperçu calculé depuis les données réelles' : 'charge l’aperçu pour vérifier',
    tone: !isPreviewLoaded.value ? 'neutral' as BadgeTone : blockingCount.value === 0 ? 'success' as BadgeTone : 'danger' as BadgeTone,
  },
  {
    label: 'Structure app',
    value: `${ingredientCount.value} / ${stepCount.value}`,
    detail: 'ingrédients / étapes',
    tone: ingredientCount.value > 0 && stepCount.value > 0 ? 'success' as BadgeTone : 'warning' as BadgeTone,
  },
  {
    label: 'Dernière mise à jour',
    value: formattedUpdatedAt.value,
    detail: 'source : recettes officielles',
    tone: 'neutral' as BadgeTone,
  },
])

function statusTone(status?: string | null): BadgeTone {
  if (status === 'published') return 'success'
  if (status === 'review') return 'warning'
  if (status === 'archived') return 'neutral'
  if (status === 'draft') return 'primary'

  return 'neutral'
}

function blockingLabel(field: string) {
  return blockingLabels[field] ?? field
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Non disponible'

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function clearMessages() {
  feedback.value = ''
  errorMessage.value = ''
}

async function loadRecipes() {
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

    recipe.value = selectedRecipeOption.value ? { ...selectedRecipeOption.value } : null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les recettes.'
  } finally {
    loadingRecipes.value = false
  }
}

async function loadPreview() {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Sélectionne une recette.'
    return
  }

  loading.value = true
  clearMessages()

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

async function refreshAfterMutation(response: RecipePreviewResponse) {
  recipe.value = response.data ?? recipe.value
  preview.value = response.preview ?? preview.value
  await loadRecipes()
}

async function runAction(action: Exclude<WorkflowAction, 'archive'>) {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Sélectionne une recette.'
    return
  }

  loading.value = true
  actionPending.value = action
  clearMessages()

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

async function archiveRecipe() {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Sélectionne une recette.'
    return
  }

  loading.value = true
  actionPending.value = 'archive'
  clearMessages()

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

watch(recipeId, (nextRecipeId) => {
  preview.value = null
  clearMessages()
  recipe.value = selectedRecipeOption.value ? { ...selectedRecipeOption.value } : null
  void router.replace({
    query: {
      ...route.query,
      ...(nextRecipeId ? { recipeId: nextRecipeId } : {}),
    },
  })
})

onMounted(async () => {
  await loadRecipes()
  if (recipeId.value) {
    await loadPreview()
  }
})
</script>

<template>
  <section class="admin-page">
    <AdminPageHeader
      eyebrow="COUR-101 · Workflow recettes"
      title="Publication des recettes"
      description="Contrôler les champs bloquants, comparer le rendu mobile/web et appliquer les transitions réellement utilisées par l’application."
    >
      <template #actions>
        <BaseBadge :tone="statusTone(loadedStatus)">
          {{ currentStatusLabel }}
        </BaseBadge>
        <BaseButton type="button" variant="secondary" :disabled="loading || !recipeId" @click="loadPreview">
          {{ loading ? 'Chargement…' : 'Actualiser l’aperçu' }}
        </BaseButton>
      </template>
    </AdminPageHeader>

    <p
      v-if="feedback"
      class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success"
    >
      {{ feedback }}
    </p>
    <p
      v-if="errorMessage"
      class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger"
    >
      {{ errorMessage }}
    </p>

    <form
      class="admin-toolbar grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto]"
      @submit.prevent="loadPreview"
    >
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Recette
        <select v-model="recipeId" :disabled="loadingRecipes">
          <option value="">{{ loadingRecipes ? 'Chargement…' : 'Sélectionner une recette' }}</option>
          <option v-for="item in recipes" :key="item.id" :value="item.id">
            {{ item.title || 'Recette sans titre' }} · {{ statusLabels[item.status] }}
          </option>
        </select>
        <span class="truncate text-xs font-medium text-coursia-muted">{{ selectedRecipeLabel }}</span>
      </label>

      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Note d’historique
        <input v-model="reason" placeholder="Validation finale, correction, dépublication…">
        <span class="text-xs font-medium text-coursia-muted">Optionnel. Envoyé aux routes de workflow si renseigné.</span>
      </label>

      <div class="flex items-end">
        <BaseButton type="submit" :disabled="loading || !recipeId">
          Charger
        </BaseButton>
      </div>
    </form>

    <div class="grid gap-3 md:grid-cols-4">
      <article v-for="stat in overviewStats" :key="stat.label" class="admin-stat-card">
        <span>{{ stat.label }}</span>
        <strong>
          <BaseBadge :tone="stat.tone">{{ stat.value }}</BaseBadge>
        </strong>
        <small>{{ stat.detail }}</small>
      </article>
    </div>

    <div class="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <aside class="grid gap-4">
        <AdminPanel
          title="Cycle de publication"
          description="Le statut officiel pilote la visibilité mobile/web."
        >
          <template #actions>
            <BaseBadge tone="neutral">statut</BaseBadge>
          </template>

          <div class="mt-4 grid gap-2">
            <div
              v-for="(step, index) in workflowSteps"
              :key="step.value"
              class="rounded-2xl border p-3 transition"
              :class="loadedStatus === step.value ? 'border-coursia-primary/30 bg-coursia-primary/10' : 'border-coursia-border bg-coursia-surface-muted'"
            >
              <div class="flex items-start gap-3">
                <span
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-xs font-semibold"
                  :class="index <= activeStepIndex ? 'border-coursia-primary bg-coursia-primary text-white' : 'border-coursia-border bg-coursia-surface text-coursia-muted'"
                >
                  {{ index + 1 }}
                </span>
                <div>
                  <p class="font-semibold text-coursia-text">{{ step.label }}</p>
                  <p class="mt-1 text-xs leading-5 text-coursia-muted">{{ statusDescriptions[step.value] }}</p>
                </div>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Actions réelles">
          <div class="mt-4 grid gap-2">
            <BaseButton
              type="button"
              variant="secondary"
              :disabled="loading || !recipeId || recipe?.status === 'review'"
              @click="runAction('submit-review')"
            >
              {{ actionPending === 'submit-review' ? 'Envoi…' : 'Envoyer en validation' }}
            </BaseButton>
            <BaseButton
              type="button"
              :disabled="loading || !canPublish || recipe?.status === 'published'"
              @click="runAction('publish')"
            >
              {{ actionPending === 'publish' ? 'Publication…' : 'Publier' }}
            </BaseButton>
            <BaseButton
              type="button"
              variant="secondary"
              :disabled="loading || !recipeId || recipe?.status !== 'published'"
              @click="runAction('unpublish')"
            >
              {{ actionPending === 'unpublish' ? 'Dépublication…' : 'Dépublier' }}
            </BaseButton>
            <BaseButton
              type="button"
              variant="ghost"
              :disabled="loading || !recipeId || recipe?.status === 'archived'"
              @click="archiveRecipe"
            >
              {{ actionPending === 'archive' ? 'Archivage…' : 'Archiver' }}
            </BaseButton>
          </div>
          <p class="mt-4 rounded-2xl bg-coursia-surface-muted p-3 text-xs leading-5 text-coursia-muted">
            {{ unpublishBehaviorMessage }}
          </p>
        </AdminPanel>
      </aside>

      <section class="grid gap-4">
        <AdminPanel
          title="Checklist bloquante"
          description="La publication reste désactivée tant que cette liste n’est pas vide."
        >
          <template #actions>
            <BaseBadge :tone="!isPreviewLoaded ? 'neutral' : blockingCount === 0 ? 'success' : 'danger'">
              {{ readinessLabel }}
            </BaseBadge>
          </template>

          <div v-if="!isPreviewLoaded" class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
            Charge l’aperçu pour calculer les champs bloquants depuis les données réelles.
          </div>
          <div v-else-if="blockingFields.length" class="mt-4 grid gap-2 sm:grid-cols-2">
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
        </AdminPanel>

        <div class="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <article class="rounded-3xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-coursia-primary">Mobile</p>
                <h2 class="mt-1 text-base font-semibold text-coursia-text">Fiche app</h2>
              </div>
              <BaseBadge :tone="statusTone(preview?.mobile.status ?? recipe?.status)">
                {{ preview?.mobile.status ?? recipe?.status ?? 'draft' }}
              </BaseBadge>
            </div>

            <div class="mx-auto mt-4 max-w-[245px] rounded-[1.8rem] border border-coursia-primary bg-coursia-primary p-2 shadow-coursia-md">
              <div class="overflow-hidden rounded-[1.35rem] bg-coursia-surface">
                <div class="h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(255,122,89,0.35),transparent_30%),linear-gradient(135deg,rgba(253,242,231,0.95),rgba(234,245,238,0.95))]" />
                <div class="p-4">
                  <h3 class="text-lg font-semibold leading-tight text-coursia-text">
                    {{ preview?.mobile.title ?? recipe?.title ?? 'Titre recette' }}
                  </h3>
                  <p class="mt-2 min-h-5 text-xs text-coursia-muted">
                    {{ preview?.mobile.subtitle || 'Catégories à compléter' }}
                  </p>
                  <div class="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-coursia-text">
                    <span class="rounded-xl bg-coursia-surface-muted px-2 py-2">{{ preview?.mobile.meta.portions ?? '-' }} pers.</span>
                    <span class="rounded-xl bg-coursia-surface-muted px-2 py-2">{{ preview?.mobile.meta.durationMinutes ?? '-' }} min</span>
                    <span class="rounded-xl bg-coursia-surface-muted px-2 py-2">{{ preview?.mobile.meta.difficulty ?? '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article class="rounded-3xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-coursia-primary">Web</p>
                <h2 class="mt-1 text-base font-semibold text-coursia-text">Aperçu public</h2>
              </div>
              <BaseBadge :tone="statusTone(preview?.web.status ?? recipe?.status)">
                {{ preview?.web.status ?? recipe?.status ?? 'draft' }}
              </BaseBadge>
            </div>

            <div class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
              <h3 class="text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
                {{ preview?.web.title ?? recipe?.title ?? 'Titre recette' }}
              </h3>
              <p class="mt-2 text-sm text-coursia-muted">/{{ preview?.web.slug ?? recipe?.slug ?? 'slug-recette' }}</p>

              <dl class="mt-5 grid gap-3 sm:grid-cols-3">
                <div class="rounded-2xl bg-coursia-surface p-3">
                  <dt class="text-xs font-semibold text-coursia-muted">Source</dt>
                  <dd class="mt-1 truncate text-sm font-semibold text-coursia-text">{{ preview?.web.source ?? recipe?.source ?? 'À compléter' }}</dd>
                </div>
                <div class="rounded-2xl bg-coursia-surface p-3">
                  <dt class="text-xs font-semibold text-coursia-muted">Ingrédients</dt>
                  <dd class="mt-1 text-sm font-semibold text-coursia-text">{{ ingredientCount }}</dd>
                </div>
                <div class="rounded-2xl bg-coursia-surface p-3">
                  <dt class="text-xs font-semibold text-coursia-muted">Étapes</dt>
                  <dd class="mt-1 text-sm font-semibold text-coursia-text">{{ stepCount }}</dd>
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
