<script setup lang="ts">
import { getUnpublishBehaviorMessage } from '#shared/validation/course'

definePageMeta({
  layout: 'admin',
})

type RecipeStatus = 'draft' | 'review' | 'published' | 'archived'
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type RecipePreviewResponse = {
  data?: {
    id: string
    title: string
    slug: string
    status: RecipeStatus
  }
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
const preview = ref<RecipePreviewResponse['preview'] | null>(null)
const recipe = ref<RecipePreviewResponse['data'] | null>(null)

const statusLabels: Record<RecipeStatus, string> = {
  draft: 'Brouillon',
  review: 'En validation',
  published: 'Publié',
  archived: 'Archivé',
}

const workflowSteps: Array<{ value: RecipeStatus; description: string }> = [
  { value: 'draft', description: 'Édition libre, non visible par les utilisateurs.' },
  { value: 'review', description: 'Contrôle éditorial et qualité avant publication.' },
  { value: 'published', description: 'Visible dans les surfaces publiques et mobiles prévues.' },
  { value: 'archived', description: 'Retirée du catalogue actif, conservée pour historique.' },
]

const statusTone = (status?: string | null): BadgeTone => {
  if (status === 'published') return 'success'
  if (status === 'review') return 'warning'
  if (status === 'archived') return 'neutral'
  return 'primary'
}

const blockingCount = computed(() => preview.value?.blockingFields.length ?? 0)
const canPublish = computed(() => Boolean(recipe.value) && blockingCount.value === 0)
const mobileIngredientCount = computed(() => preview.value?.mobile.ingredients.length ?? 0)
const mobileStepCount = computed(() => preview.value?.mobile.steps.length ?? 0)

const loadPreview = async () => {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Indique un ID de recette.'
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

const runAction = async (action: 'submit-review' | 'publish' | 'unpublish') => {
  if (!recipeId.value.trim()) {
    errorMessage.value = 'Indique un ID de recette.'
    return
  }

  loading.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<RecipePreviewResponse & { behavior?: string }>(
      `/api/admin/recipes/${recipeId.value.trim()}/${action}`,
      {
        method: 'POST',
        body: { reason: reason.value || undefined },
      },
    )

    recipe.value = response.data ?? null
    preview.value = response.preview ?? null
    feedback.value = response.behavior ?? 'Workflow de publication mis à jour et historisé.'
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Action refusée : vérifie les champs bloquants et les droits.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-101</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Prévisualisation et publication
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Charge une recette, vérifie les champs bloquants, compare les aperçus mobile/web puis
          lance la validation ou la publication.
        </p>
      </div>

      <BaseBadge :tone="statusTone(recipe?.status)">
        {{ recipe ? statusLabels[recipe.status] : 'Aucune recette' }}
      </BaseBadge>
    </div>

    <form class="admin-toolbar mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_auto]" @submit.prevent="loadPreview">
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
        ID de recette
        <input
          v-model="recipeId"
          placeholder="UUID recette"
          class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        >
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
        Raison / note d’historique
        <input
          v-model="reason"
          placeholder="Validation finale, correction, dépublication..."
          class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        >
      </label>
      <BaseButton class="self-end" type="submit" :disabled="loading">
        {{ loading ? 'Chargement...' : 'Charger l’aperçu' }}
      </BaseButton>
    </form>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Statut</p>
        <p class="mt-3 text-2xl font-semibold text-[#101828]">
          {{ recipe ? statusLabels[recipe.status] : '—' }}
        </p>
        <p class="mt-1 text-xs text-[#667085]">{{ recipe?.slug || 'aucune recette chargée' }}</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Bloquants</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ blockingCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">avant publication</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Ingrédients</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ mobileIngredientCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">dans l’aperçu mobile</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Étapes</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ mobileStepCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">instructions visibles</p>
      </article>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside class="grid gap-5">
        <section class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
          <h2 class="text-sm font-semibold text-[#101828]">Workflow</h2>
          <div class="mt-4 grid gap-3">
            <div
              v-for="step in workflowSteps"
              :key="step.value"
              class="rounded-2xl border border-[#e6e1d8] p-4"
              :class="recipe?.status === step.value ? 'bg-[#f1f7f4]' : 'bg-[#fbfaf7]'"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="font-semibold text-[#101828]">{{ statusLabels[step.value] }}</span>
                <BaseBadge :tone="recipe?.status === step.value ? statusTone(step.value) : 'neutral'">
                  {{ recipe?.status === step.value ? 'Actuel' : 'Disponible' }}
                </BaseBadge>
              </div>
              <p class="mt-2 text-xs text-[#667085]">{{ step.description }}</p>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
          <h2 class="text-sm font-semibold text-[#101828]">Actions</h2>
          <div class="mt-4 grid gap-2">
            <BaseButton type="button" variant="secondary" :disabled="loading" @click="runAction('submit-review')">
              Envoyer en validation
            </BaseButton>
            <BaseButton type="button" :disabled="loading || !canPublish" @click="runAction('publish')">
              Publier
            </BaseButton>
            <BaseButton type="button" variant="secondary" :disabled="loading" @click="runAction('unpublish')">
              Dépublier
            </BaseButton>
          </div>
          <p class="mt-4 text-xs text-[#667085]">{{ getUnpublishBehaviorMessage() }}</p>
        </section>
      </aside>

      <section class="grid gap-6">
        <article class="admin-table overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
          <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
            <div>
              <h2 class="text-sm font-semibold text-[#101828]">Champs bloquants</h2>
              <p class="mt-1 text-xs text-[#667085]">La publication reste désactivée tant qu’il en reste.</p>
            </div>
            <BaseBadge :tone="blockingCount === 0 ? 'success' : 'danger'">
              {{ blockingCount === 0 ? 'OK' : `${blockingCount} à corriger` }}
            </BaseBadge>
          </div>

          <div v-if="preview?.blockingFields.length" class="grid gap-2 p-5">
            <div
              v-for="field in preview.blockingFields"
              :key="field"
              class="rounded-xl border border-coursia-danger/20 bg-coursia-danger/10 px-4 py-3 text-sm text-coursia-danger"
            >
              {{ field }}
            </div>
          </div>
          <div v-else class="p-5 text-sm text-[#667085]">
            Aucun champ bloquant détecté pour la recette chargée.
          </div>
        </article>

        <div class="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <article class="rounded-[2rem] border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#667085]">Aperçu mobile</p>
            <div class="mx-auto mt-5 max-w-[280px] rounded-[2.2rem] border border-[#101828] bg-[#101828] p-2">
              <div class="rounded-[1.8rem] bg-[#fbfaf7] p-4">
                <BaseBadge :tone="statusTone(preview?.mobile.status)">{{ preview?.mobile.status ?? 'draft' }}</BaseBadge>
                <h3 class="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#101828]">
                  {{ preview?.mobile.title ?? 'Titre recette' }}
                </h3>
                <p class="mt-2 text-sm text-[#667085]">{{ preview?.mobile.subtitle || 'Catégories' }}</p>
                <div class="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-[#344054]">
                  <span class="rounded-xl bg-white px-2 py-3">{{ preview?.mobile.meta.portions ?? '-' }} pers.</span>
                  <span class="rounded-xl bg-white px-2 py-3">{{ preview?.mobile.meta.durationMinutes ?? '-' }} min</span>
                  <span class="rounded-xl bg-white px-2 py-3">{{ preview?.mobile.meta.difficulty ?? '-' }}</span>
                </div>
              </div>
            </div>
          </article>

          <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#667085]">Aperçu web</p>
            <div class="mt-5 rounded-2xl bg-[#fbfaf7] p-6">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 class="text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
                    {{ preview?.web.title ?? 'Titre recette' }}
                  </h3>
                  <p class="mt-2 text-sm text-[#667085]">/{{ preview?.web.slug ?? 'slug-recette' }}</p>
                </div>
                <BaseBadge :tone="statusTone(preview?.web.status)">
                  {{ preview?.web.status ?? 'draft' }}
                </BaseBadge>
              </div>
              <p class="mt-5 text-sm text-[#667085]">Source : {{ preview?.web.source ?? 'À compléter' }}</p>
              <div class="mt-5 flex flex-wrap gap-2">
                <BaseBadge
                  v-for="category in preview?.web.categories ?? []"
                  :key="category"
                  tone="neutral"
                >
                  {{ category }}
                </BaseBadge>
                <span v-if="!(preview?.web.categories?.length)" class="text-sm text-[#98a2b3]">
                  Aucune catégorie.
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
