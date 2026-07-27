<script setup lang="ts">
import { getUnpublishBehaviorMessage } from '#shared/validation/course'

definePageMeta({
  layout: 'admin',
})

type RecipePreviewResponse = {
  data?: {
    id: string
    title: string
    slug: string
    status: 'draft' | 'review' | 'published' | 'archived'
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
const loading = ref(false)
const preview = ref<RecipePreviewResponse['preview'] | null>(null)
const recipe = ref<RecipePreviewResponse['data'] | null>(null)

const statusLabels = {
  draft: 'Brouillon',
  review: 'En validation',
  published: 'Publié',
  archived: 'Archivé',
} as const

const loadPreview = async () => {
  if (!recipeId.value) return

  loading.value = true
  feedback.value = ''

  try {
    const response = await $fetch<RecipePreviewResponse>(`/api/admin/recipes/${recipeId.value}/preview`)
    recipe.value = response.data ?? null
    preview.value = response.preview ?? null
    feedback.value = 'Aperçu mobile et web chargé.'
  } catch {
    feedback.value = 'Impossible de charger lâ€™aperçu de publication.'
  } finally {
    loading.value = false
  }
}

const runAction = async (action: 'submit-review' | 'publish' | 'unpublish') => {
  if (!recipeId.value) return

  loading.value = true
  feedback.value = ''

  try {
    const response = await $fetch<RecipePreviewResponse & { behavior?: string }>(
      `/api/admin/recipes/${recipeId.value}/${action}`,
      {
        method: 'POST',
        body: { reason: reason.value || undefined },
      },
    )

    recipe.value = response.data ?? null
    preview.value = response.preview ?? null
    feedback.value = response.behavior ?? 'Workflow de publication mis à jour et historisé.'
  } catch {
    feedback.value = 'Action refusée : vérifie les champs bloquants et les droits de publication.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-101</p>
        <h1 class="mt-2 text-3xl font-black">Prévisualisation et publication des recettes</h1>
        <p class="mt-3 max-w-3xl text-coursia-muted">
          Contrôle des états brouillon, en validation, publié et archivé avec aperçu mobile/web,
          champs bloquants, droits de publication et historique des modifications importantes.
        </p>
      </div>
      <div class="rounded-full bg-coursia-surface-muted px-4 py-2 text-sm font-black">
        Dépublier : retour en brouillon
      </div>
    </div>

    <form class="mt-8 grid gap-4 rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5 lg:grid-cols-[1fr_1fr_auto]" @submit.prevent="loadPreview">
      <label class="grid gap-2 text-sm font-bold">
        ID de recette
        <input v-model="recipeId" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" placeholder="UUID recette" />
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Raison / note dâ€™historique
        <input v-model="reason" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" placeholder="Correction, validation finale, dépublication..." />
      </label>
      <BaseButton class="self-end" type="submit" :disabled="loading">Charger lâ€™aperçu</BaseButton>
    </form>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <section class="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Workflow</h2>
        <div class="mt-5 grid gap-3">
          <div
            v-for="(label, status) in statusLabels"
            :key="status"
            class="flex items-center justify-between rounded-2xl bg-coursia-background p-4"
          >
            <span class="font-bold">{{ label }}</span>
            <span class="text-sm text-coursia-muted">{{ recipe?.status === status ? 'Ã‰tat actuel' : 'Disponible' }}</span>
          </div>
        </div>

        <div class="mt-6 grid gap-3">
          <BaseButton type="button" variant="secondary" :disabled="loading" @click="runAction('submit-review')">
            Envoyer en validation
          </BaseButton>
          <BaseButton type="button" :disabled="loading" @click="runAction('publish')">
            Publier avec droits administrateur
          </BaseButton>
          <BaseButton type="button" variant="secondary" :disabled="loading" @click="runAction('unpublish')">
            Dépublier
          </BaseButton>
        </div>

        <p class="mt-5 text-sm text-coursia-muted">{{ getUnpublishBehaviorMessage() }}</p>
      </div>

      <div class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Champs bloquants avant publication</h2>
        <ul v-if="preview?.blockingFields.length" class="mt-4 grid gap-2 text-sm">
          <li v-for="field in preview.blockingFields" :key="field" class="rounded-xl bg-coursia-danger/10 px-3 py-2 text-coursia-danger">
            {{ field }}
          </li>
        </ul>
        <p v-else class="mt-4 rounded-xl bg-coursia-success/10 px-3 py-2 text-sm text-coursia-success">
          Aucun champ bloquant détecté.
        </p>

        <div class="mt-6 rounded-2xl bg-coursia-background p-4">
          <h3 class="font-black">Historique des modifications importantes</h3>
          <p class="mt-2 text-sm text-coursia-muted">
            Chaque passage en validation, publication ou dépublication est enregistré avec auteur,
            ancien état, nouvel état, raison et snapshot de recette.
          </p>
        </div>
      </div>
    </section>

    <section class="mt-8 grid gap-5 lg:grid-cols-2">
      <article class="rounded-[2rem] border border-coursia-border bg-coursia-surface p-5 shadow-soft">
        <p class="text-sm font-black uppercase tracking-[0.18em] text-coursia-muted">Aperçu fiche mobile</p>
        <div class="mx-auto mt-5 max-w-[320px] rounded-[2.2rem] border border-coursia-border bg-coursia-background p-4">
          <div class="rounded-[1.6rem] bg-coursia-surface-muted p-5">
            <p class="text-xs font-black uppercase text-coursia-primary">{{ preview?.mobile.status ?? 'draft' }}</p>
            <h3 class="mt-3 text-2xl font-black">{{ preview?.mobile.title ?? 'Titre recette' }}</h3>
            <p class="mt-2 text-sm text-coursia-muted">{{ preview?.mobile.subtitle || 'Catégories' }}</p>
            <div class="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
              <span class="rounded-xl bg-coursia-surface px-2 py-3">{{ preview?.mobile.meta.portions ?? '-' }} pers.</span>
              <span class="rounded-xl bg-coursia-surface px-2 py-3">{{ preview?.mobile.meta.durationMinutes ?? '-' }} min</span>
              <span class="rounded-xl bg-coursia-surface px-2 py-3">{{ preview?.mobile.meta.difficulty ?? '-' }}</span>
            </div>
          </div>
        </div>
      </article>

      <article class="rounded-[2rem] border border-coursia-border bg-coursia-surface p-5 shadow-soft">
        <p class="text-sm font-black uppercase tracking-[0.18em] text-coursia-muted">Aperçu fiche web</p>
        <div class="mt-5 rounded-[1.6rem] bg-coursia-background p-6">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-2xl font-black">{{ preview?.web.title ?? 'Titre recette' }}</h3>
              <p class="mt-2 text-sm text-coursia-muted">/{{ preview?.web.slug ?? 'slug-recette' }}</p>
            </div>
            <span class="rounded-full bg-coursia-primary px-4 py-2 text-sm font-black text-white">
              {{ preview?.web.status ?? 'draft' }}
            </span>
          </div>
          <p class="mt-5 text-sm text-coursia-muted">Source : {{ preview?.web.source ?? 'Ã€ compléter' }}</p>
          <div class="mt-5 flex flex-wrap gap-2">
            <span v-for="category in preview?.web.categories ?? []" :key="category" class="rounded-full bg-coursia-surface-muted px-3 py-1 text-sm">
              {{ category }}
            </span>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
