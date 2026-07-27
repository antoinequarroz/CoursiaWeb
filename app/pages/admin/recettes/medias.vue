<script setup lang="ts">
import {
  buildRecipeMediaRenditions,
  recipeMediaAllowedTypes,
  recipeMediaDimensions,
  recipeMediaMaxBytes,
  recipeMediaRenditions,
  type RecipeMediaMetadata,
} from '#shared/validation/recipe-media'

definePageMeta({
  layout: 'admin',
})

const form = reactive<RecipeMediaMetadata>({
  recipeId: '',
  fileName: '',
  mimeType: 'image/webp',
  sizeBytes: 0,
  width: recipeMediaDimensions.minWidth,
  height: recipeMediaDimensions.minHeight,
  crop: { x: 0, y: 0, width: 1, height: 1 },
  rights: {
    author: '',
    source: '',
    license: '',
    consentConfirmed: true,
  },
  altText: '',
  status: 'validation',
})

const feedback = ref('')
const selectedMediaId = ref('')
const orphanAssets = ref<Array<Record<string, unknown>>>([])
const renditionPreview = computed(() => buildRecipeMediaRenditions(form.fileName || 'recipe.webp'))
const validationIssues = computed(() => {
  const issues: string[] = []

  if (!recipeMediaAllowedTypes.includes(form.mimeType)) {
    issues.push('Type de fichier invalide.')
  }
  if (form.sizeBytes > recipeMediaMaxBytes) {
    issues.push('Taille de fichier trop élevée.')
  }
  if (form.width < recipeMediaDimensions.minWidth || form.height < recipeMediaDimensions.minHeight) {
    issues.push('Dimensions trop petites.')
  }

  return issues
})

const saveMetadata = async () => {
  if (validationIssues.value.length > 0) {
    feedback.value = 'Corrigez les types, dimensions ou tailles avant import.'
    return
  }

  const response = await $fetch<{ data: { id: string } }>('/api/admin/recipes/media', {
    method: 'POST',
    body: form,
  })
  selectedMediaId.value = response.data.id
  feedback.value = 'Métadonnées et droits enregistrés dans le bucket privé de validation.'
}

const publishMedia = async () => {
  await $fetch(`/api/admin/recipes/media/${selectedMediaId.value}/publish`, {
    method: 'POST',
    body: { altText: form.altText },
  })
  feedback.value = 'Média publié avec métadonnée alternative obligatoire.'
}

const replaceMedia = async () => {
  await $fetch(`/api/admin/recipes/media/${selectedMediaId.value}/replace`, {
    method: 'POST',
    body: form,
  })
  feedback.value = 'Remplacement enregistré et ancien fichier marqué comme remplacé.'
}

const loadOrphans = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>(
    '/api/admin/recipes/media/orphans',
  )
  orphanAssets.value = response.data
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">Photos de recettes</h1>
        <p class="mt-3 text-coursia-muted">
          Import, recadrage, optimisation, droits connus, publication et gestion des remplacements.
        </p>
      </div>
      <BaseButton type="button" variant="secondary" @click="loadOrphans">Fichiers orphelins</BaseButton>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveMetadata">
        <h2 class="text-2xl font-black">Importer en validation privée</h2>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            ID recette
            <input v-model="form.recipeId" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Nom de fichier
            <input v-model="form.fileName" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Type
            <select v-model="form.mimeType" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
              <option v-for="type in recipeMediaAllowedTypes" :key="type">{{ type }}</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Taille en octets
            <input v-model.number="form.sizeBytes" required type="number" min="1" :max="recipeMediaMaxBytes" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Largeur
            <input v-model.number="form.width" required type="number" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Hauteur
            <input v-model.number="form.height" required type="number" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
        </div>

        <section class="mt-6 rounded-[1.2rem] bg-coursia-background p-4">
          <h3 class="text-lg font-black">Recadrage</h3>
          <div class="mt-4 grid gap-3 md:grid-cols-4">
            <label class="grid gap-2 text-sm font-bold">X<input v-model.number="form.crop.x" type="number" min="0" max="1" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" /></label>
            <label class="grid gap-2 text-sm font-bold">Y<input v-model.number="form.crop.y" type="number" min="0" max="1" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" /></label>
            <label class="grid gap-2 text-sm font-bold">Largeur<input v-model.number="form.crop.width" type="number" min="0.01" max="1" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" /></label>
            <label class="grid gap-2 text-sm font-bold">Hauteur<input v-model.number="form.crop.height" type="number" min="0.01" max="1" step="0.01" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" /></label>
          </div>
        </section>

        <section class="mt-6 rounded-[1.2rem] bg-coursia-background p-4">
          <h3 class="text-lg font-black">Droits et consentement</h3>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <label class="grid gap-2 text-sm font-bold">Auteur<input v-model="form.rights.author" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" /></label>
            <label class="grid gap-2 text-sm font-bold">Source<input v-model="form.rights.source" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" /></label>
            <label class="grid gap-2 text-sm font-bold">Licence<input v-model="form.rights.license" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" /></label>
            <label class="flex items-center gap-3 text-sm font-bold">
              <input v-model="form.rights.consentConfirmed" required type="checkbox" />
              Consentement confirmé
            </label>
          </div>
          <label class="mt-4 grid gap-2 text-sm font-bold">
            Texte alternatif obligatoire avant publication
            <input v-model="form.altText" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
        </section>

        <div v-if="validationIssues.length" class="mt-4 rounded-2xl bg-coursia-danger/10 p-4 text-sm text-coursia-danger">
          {{ validationIssues.join(' ') }}
        </div>

        <div class="mt-6 flex flex-wrap gap-3">
          <BaseButton type="submit">Enregistrer en validation</BaseButton>
          <BaseButton type="button" variant="secondary" @click="publishMedia">Publier</BaseButton>
          <BaseButton type="button" variant="ghost" @click="replaceMedia">Remplacer</BaseButton>
        </div>
      </form>

      <section class="grid gap-5">
        <div class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-2xl font-black">Aperçus web/mobile</h2>
          <div class="mt-5 grid gap-4 md:grid-cols-3">
            <article
              v-for="rendition in recipeMediaRenditions"
              :key="rendition.name"
              class="rounded-[1.2rem] bg-coursia-background p-4"
            >
              <div class="aspect-[4/3] rounded-xl bg-coursia-surface-muted" />
              <p class="mt-3 font-black">{{ rendition.name }}</p>
              <p class="text-sm text-coursia-muted">
                {{ rendition.width }}×{{ rendition.height }} {{ rendition.format }}
              </p>
            </article>
          </div>
        </div>

        <div class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-2xl font-black">Tailles optimisées générées</h2>
          <ul class="mt-4 space-y-2 text-sm text-coursia-muted">
            <li v-for="rendition in renditionPreview" :key="rendition.name">
              {{ rendition.name }} — {{ rendition.path }}
            </li>
          </ul>
        </div>

        <div class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-2xl font-black">Fichiers orphelins</h2>
          <p class="mt-3 text-sm text-coursia-muted">
            Les fichiers sans recette ou marqués orphaned sont listés avant nettoyage.
          </p>
          <ul class="mt-4 space-y-2 text-sm text-coursia-muted">
            <li v-for="asset in orphanAssets" :key="String(asset.id)">
              {{ asset.private_path }}
            </li>
          </ul>
        </div>
      </section>
    </div>
  </section>
</template>

