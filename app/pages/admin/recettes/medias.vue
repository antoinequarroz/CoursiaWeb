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

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

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
const errorMessage = ref('')
const selectedMediaId = ref('')
const orphanAssets = ref<Array<Record<string, unknown>>>([])
const loading = ref(false)
const saving = ref(false)

const renditionPreview = computed(() => buildRecipeMediaRenditions(form.fileName || 'recipe.webp'))
const readableMaxSize = computed(() => `${Math.round(recipeMediaMaxBytes / 1024 / 1024)} Mo`)
const cropPercent = computed(() => ({
  x: Math.round(form.crop.x * 100),
  y: Math.round(form.crop.y * 100),
  width: Math.round(form.crop.width * 100),
  height: Math.round(form.crop.height * 100),
}))

const validationIssues = computed(() => {
  const issues: string[] = []

  if (!recipeMediaAllowedTypes.includes(form.mimeType)) {
    issues.push('Type de fichier invalide.')
  }
  if (form.sizeBytes > recipeMediaMaxBytes) {
    issues.push(`Taille supérieure à ${readableMaxSize.value}.`)
  }
  if (form.width < recipeMediaDimensions.minWidth || form.height < recipeMediaDimensions.minHeight) {
    issues.push(`Dimensions minimales : ${recipeMediaDimensions.minWidth}×${recipeMediaDimensions.minHeight}.`)
  }
  if (form.width > recipeMediaDimensions.maxWidth || form.height > recipeMediaDimensions.maxHeight) {
    issues.push(`Dimensions maximales : ${recipeMediaDimensions.maxWidth}×${recipeMediaDimensions.maxHeight}.`)
  }
  if (!form.rights.consentConfirmed) {
    issues.push('Consentement requis.')
  }

  return issues
})

const statusTone = (status: RecipeMediaMetadata['status']): BadgeTone => {
  if (status === 'published') return 'success'
  if (status === 'validation') return 'warning'
  if (status === 'replaced') return 'neutral'
  return 'danger'
}

const saveMetadata = async () => {
  if (validationIssues.value.length > 0) {
    feedback.value = ''
    errorMessage.value = 'Corrige les métadonnées avant l’enregistrement.'
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: { id: string } }>('/api/admin/recipes/media', {
      method: 'POST',
      body: form,
    })
    selectedMediaId.value = response.data.id
    feedback.value = 'Métadonnées et droits enregistrés dans le bucket privé de validation.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Enregistrement impossible.'
  } finally {
    saving.value = false
  }
}

const publishMedia = async () => {
  if (!selectedMediaId.value) {
    errorMessage.value = 'Enregistre un média avant publication.'
    return
  }

  await $fetch(`/api/admin/recipes/media/${selectedMediaId.value}/publish`, {
    method: 'POST',
    body: { altText: form.altText },
  })
  form.status = 'published'
  feedback.value = 'Média publié avec texte alternatif obligatoire.'
}

const replaceMedia = async () => {
  if (!selectedMediaId.value) {
    errorMessage.value = 'Sélectionne ou enregistre un média avant remplacement.'
    return
  }

  await $fetch(`/api/admin/recipes/media/${selectedMediaId.value}/replace`, {
    method: 'POST',
    body: form,
  })
  form.status = 'replaced'
  feedback.value = 'Remplacement enregistré et ancien fichier marqué comme remplacé.'
}

const loadOrphans = async () => {
  loading.value = true

  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>(
      '/api/admin/recipes/media/orphans',
    )
    orphanAssets.value = response.data
  } finally {
    loading.value = false
  }
}

onMounted(loadOrphans)
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-99</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Photos de recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Valide les métadonnées image, droits, recadrage et renditions avant publication dans
          Supabase Storage.
        </p>
      </div>

      <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadOrphans">
        {{ loading ? 'Chargement...' : 'Fichiers orphelins' }}
      </BaseButton>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Statut</p>
        <div class="mt-3">
          <BaseBadge :tone="statusTone(form.status)">{{ form.status }}</BaseBadge>
        </div>
        <p class="mt-3 text-xs text-[#667085]">média courant</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Dimensions</p>
        <p class="mt-3 text-2xl font-semibold text-[#101828]">{{ form.width }}×{{ form.height }}</p>
        <p class="mt-1 text-xs text-[#667085]">source importée</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Renditions</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ recipeMediaRenditions.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">mobile, web, social</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Orphelins</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ orphanAssets.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">à vérifier</p>
      </article>
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]" @submit.prevent="saveMetadata">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Validation privée</p>
            <h2 class="mt-2 text-lg font-semibold text-[#101828]">Métadonnées image</h2>
          </div>
          <BaseBadge tone="neutral">{{ selectedMediaId || 'Non enregistré' }}</BaseBadge>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            ID recette
            <input v-model="form.recipeId" required class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Nom de fichier
            <input v-model="form.fileName" required class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Type
            <select v-model="form.mimeType" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
              <option v-for="type in recipeMediaAllowedTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Taille en octets
            <input v-model.number="form.sizeBytes" required type="number" min="1" :max="recipeMediaMaxBytes" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Largeur
            <input v-model.number="form.width" required type="number" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Hauteur
            <input v-model.number="form.height" required type="number" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
        </div>

        <section class="mt-5 rounded-2xl bg-[#fbfaf7] p-4">
          <h3 class="text-sm font-semibold text-[#101828]">Recadrage</h3>
          <div class="mt-3 grid grid-cols-4 gap-2">
            <label class="grid gap-1 text-xs text-[#667085]">X<input v-model.number="form.crop.x" type="number" min="0" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm"></label>
            <label class="grid gap-1 text-xs text-[#667085]">Y<input v-model.number="form.crop.y" type="number" min="0" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm"></label>
            <label class="grid gap-1 text-xs text-[#667085]">L<input v-model.number="form.crop.width" type="number" min="0.01" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm"></label>
            <label class="grid gap-1 text-xs text-[#667085]">H<input v-model.number="form.crop.height" type="number" min="0.01" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm"></label>
          </div>
          <p class="mt-3 text-xs text-[#667085]">
            Zone : {{ cropPercent.x }}%, {{ cropPercent.y }}%, {{ cropPercent.width }}% × {{ cropPercent.height }}%.
          </p>
        </section>

        <section class="mt-5 rounded-2xl border border-[#e6e1d8] p-4">
          <h3 class="text-sm font-semibold text-[#101828]">Droits et accessibilité</h3>
          <div class="mt-3 grid gap-3">
            <input v-model="form.rights.author" required placeholder="Auteur" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            <input v-model="form.rights.source" required placeholder="Source" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            <input v-model="form.rights.license" required placeholder="Licence" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            <label class="flex items-center gap-3 text-sm text-[#344054]">
              <input v-model="form.rights.consentConfirmed" required type="checkbox">
              Consentement confirmé
            </label>
            <input v-model="form.altText" placeholder="Texte alternatif avant publication" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </div>
        </section>

        <div v-if="validationIssues.length" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-xs text-coursia-danger">
          <p v-for="issue in validationIssues" :key="issue">{{ issue }}</p>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <BaseButton type="submit" :disabled="saving">
            {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" @click="publishMedia">Publier</BaseButton>
          <BaseButton type="button" variant="ghost" @click="replaceMedia">Remplacer</BaseButton>
        </div>
      </form>

      <aside class="grid gap-5">
        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
          <h2 class="text-sm font-semibold text-[#101828]">Aperçu média</h2>
          <div class="mt-4 overflow-hidden rounded-2xl bg-[#fbfaf7]">
            <div class="aspect-[4/3] bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.20),transparent_30%),linear-gradient(135deg,#fff7ed,#eef7f2)]" />
          </div>
          <p class="mt-3 text-xs text-[#667085]">
            Maquette de prévisualisation. Le fichier réel est géré côté Storage.
          </p>
        </article>

        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
          <h2 class="text-sm font-semibold text-[#101828]">Renditions générées</h2>
          <div class="mt-4 grid gap-3">
            <div v-for="rendition in renditionPreview" :key="rendition.name" class="rounded-2xl bg-[#fbfaf7] p-4">
              <div class="flex items-center justify-between gap-3">
                <span class="font-semibold text-[#101828]">{{ rendition.name }}</span>
                <BaseBadge tone="neutral">{{ rendition.width }}×{{ rendition.height }}</BaseBadge>
              </div>
              <p class="mt-2 break-all text-xs text-[#667085]">{{ rendition.path }}</p>
            </div>
          </div>
        </article>
      </aside>
    </div>

    <section class="admin-table mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Fichiers orphelins</h2>
          <p class="mt-1 text-xs text-[#667085]">Fichiers sans recette ou marqués orphelins avant nettoyage.</p>
        </div>
        <BaseBadge tone="warning">{{ orphanAssets.length }}</BaseBadge>
      </div>

      <div v-if="orphanAssets.length === 0" class="p-5 text-sm text-[#667085]">
        Aucun fichier orphelin chargé.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#eee8df] text-sm">
          <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
            <tr>
              <th class="px-5 py-3">Chemin privé</th>
              <th class="px-5 py-3">Recette</th>
              <th class="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df]">
            <tr v-for="asset in orphanAssets" :key="String(asset.id)" class="transition hover:bg-[#fbfaf7]">
              <td class="px-5 py-4 font-medium text-[#101828]">{{ asset.private_path || asset.path || asset.id }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ asset.recipe_id || '—' }}</td>
              <td class="px-5 py-4"><BaseBadge tone="warning">{{ asset.status || 'orphaned' }}</BaseBadge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
