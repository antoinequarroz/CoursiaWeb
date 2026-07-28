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
type RecipeOption = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'review' | 'published' | 'archived'
}

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
const recipes = ref<RecipeOption[]>([])
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const loading = ref(false)
const loadingRecipes = ref(true)
const saving = ref(false)

const renditionPreview = computed(() => buildRecipeMediaRenditions(form.fileName || 'recipe.webp'))
const readableMaxSize = computed(() => `${Math.round(recipeMediaMaxBytes / 1024 / 1024)} Mo`)
const selectedRecipe = computed(() => recipes.value.find((recipe) => recipe.id === form.recipeId) ?? null)
const canUpload = computed(() => !!selectedFile.value && validationIssues.value.length === 0)
const cropPercent = computed(() => ({
  x: Math.round(form.crop.x * 100),
  y: Math.round(form.crop.y * 100),
  width: Math.round(form.crop.width * 100),
  height: Math.round(form.crop.height * 100),
}))

const validationIssues = computed(() => {
  const issues: string[] = []

  if (!selectedFile.value) issues.push('Sélectionne un fichier image.')
  if (!form.recipeId) issues.push('Sélectionne une recette.')
  if (!recipeMediaAllowedTypes.includes(form.mimeType)) issues.push('Type de fichier invalide.')
  if (form.sizeBytes > recipeMediaMaxBytes) issues.push(`Taille supérieure à ${readableMaxSize.value}.`)
  if (form.width < recipeMediaDimensions.minWidth || form.height < recipeMediaDimensions.minHeight) {
    issues.push(`Dimensions minimales : ${recipeMediaDimensions.minWidth}×${recipeMediaDimensions.minHeight}.`)
  }
  if (form.width > recipeMediaDimensions.maxWidth || form.height > recipeMediaDimensions.maxHeight) {
    issues.push(`Dimensions maximales : ${recipeMediaDimensions.maxWidth}×${recipeMediaDimensions.maxHeight}.`)
  }
  if (!form.rights.consentConfirmed) issues.push('Consentement requis.')
  if (form.status === 'published' && !form.altText?.trim()) issues.push('Texte alternatif requis avant publication.')

  return issues
})

const statusTone = (status: RecipeMediaMetadata['status']): BadgeTone => {
  if (status === 'published') return 'success'
  if (status === 'validation') return 'warning'
  if (status === 'replaced') return 'neutral'

  return 'danger'
}

const setPreviewUrl = (file: File) => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  previewUrl.value = URL.createObjectURL(file)
}

const readImageDimensions = (file: File) => new Promise<{ width: number; height: number }>((resolve, reject) => {
  const image = new Image()
  const url = URL.createObjectURL(file)

  image.onload = () => {
    resolve({ width: image.naturalWidth, height: image.naturalHeight })
    URL.revokeObjectURL(url)
  }
  image.onerror = () => {
    reject(new Error('Impossible de lire les dimensions de l’image.'))
    URL.revokeObjectURL(url)
  }
  image.src = url
})

const onFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    selectedFile.value = null
    return
  }

  selectedFile.value = file
  form.fileName = file.name
  form.mimeType = file.type as RecipeMediaMetadata['mimeType']
  form.sizeBytes = file.size
  form.status = 'validation'
  setPreviewUrl(file)

  try {
    const dimensions = await readImageDimensions(file)
    form.width = dimensions.width
    form.height = dimensions.height
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Lecture image impossible.'
  }
}

const loadRecipes = async () => {
  loadingRecipes.value = true

  try {
    const response = await $fetch<{ data: RecipeOption[] }>('/api/admin/recipes', {
      query: { limit: 100 },
    })
    recipes.value = response.data
    if (!form.recipeId && recipes.value.length > 0) {
      form.recipeId = recipes.value[0]?.id ?? ''
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les recettes.'
  } finally {
    loadingRecipes.value = false
  }
}

const uploadMedia = async (replaceOfId?: string) => {
  if (!selectedFile.value) {
    feedback.value = ''
    errorMessage.value = 'Sélectionne un fichier image avant l’import.'
    return
  }
  if (validationIssues.value.length > 0) {
    feedback.value = ''
    errorMessage.value = 'Corrige les métadonnées avant l’import.'
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const payload = new FormData()
    payload.append('file', selectedFile.value)
    payload.append('metadata', JSON.stringify(form))
    if (replaceOfId) {
      payload.append('replaceOfId', replaceOfId)
    }

    const response = await $fetch<{ data: { id: string; private_path: string } }>('/api/admin/recipes/media/upload', {
      method: 'POST',
      body: payload,
    })
    selectedMediaId.value = response.data.id
    form.status = 'validation'
    feedback.value = `Fichier importé dans le bucket privé : ${response.data.private_path}`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Import impossible.'
  } finally {
    saving.value = false
  }
}

const publishMedia = async () => {
  if (!selectedMediaId.value) {
    errorMessage.value = 'Importe un média avant publication.'
    return
  }
  if (!form.altText?.trim()) {
    errorMessage.value = 'Ajoute un texte alternatif avant publication.'
    return
  }

  try {
    await $fetch(`/api/admin/recipes/media/${selectedMediaId.value}/publish`, {
      method: 'POST',
      body: { altText: form.altText },
    })
    form.status = 'published'
    feedback.value = 'Média publié dans le bucket public avec texte alternatif.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Publication impossible.'
  }
}

const replaceMedia = async () => {
  if (!selectedMediaId.value) {
    errorMessage.value = 'Importe un média avant remplacement.'
    return
  }

  await uploadMedia(selectedMediaId.value)
  feedback.value = 'Nouveau fichier importé et ancien média marqué comme remplacé.'
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

onMounted(() => {
  void loadRecipes()
  void loadOrphans()
})

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-99</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828] dark:text-white">
          Photos de recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085] dark:text-white/60">
          Importe l’image réelle dans Supabase Storage, conserve les droits, puis publie uniquement le média validé.
        </p>
      </div>

      <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadOrphans">
        {{ loading ? 'Chargement...' : 'Actualiser les orphelins' }}
      </BaseButton>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085] dark:text-white/50">Statut</p>
        <div class="mt-3">
          <BaseBadge :tone="statusTone(form.status)">{{ form.status }}</BaseBadge>
        </div>
        <p class="mt-3 text-xs text-[#667085] dark:text-white/50">média courant</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085] dark:text-white/50">Dimensions</p>
        <p class="mt-3 text-2xl font-semibold text-[#101828] dark:text-white">{{ form.width }}×{{ form.height }}</p>
        <p class="mt-1 text-xs text-[#667085] dark:text-white/50">lues depuis le fichier</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085] dark:text-white/50">Renditions</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828] dark:text-white">{{ recipeMediaRenditions.length }}</p>
        <p class="mt-1 text-xs text-[#667085] dark:text-white/50">mobile, web, social</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085] dark:text-white/50">Orphelins</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828] dark:text-white">{{ orphanAssets.length }}</p>
        <p class="mt-1 text-xs text-[#667085] dark:text-white/50">à vérifier</p>
      </article>
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)] dark:border-white/10 dark:bg-white/5" @submit.prevent="uploadMedia()">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Validation privée</p>
            <h2 class="mt-2 text-lg font-semibold text-[#101828] dark:text-white">Image et métadonnées</h2>
          </div>
          <BaseBadge tone="neutral">{{ selectedMediaId || 'Non importé' }}</BaseBadge>
        </div>

        <label class="mt-5 grid cursor-pointer gap-2 rounded-2xl border border-dashed border-[#cfc7b8] bg-[#fbfaf7] p-5 text-sm text-[#344054] transition hover:border-coursia-primary dark:border-white/15 dark:bg-white/5 dark:text-white/70">
          <span class="font-semibold text-[#101828] dark:text-white">Importer une photo</span>
          <span>JPEG, PNG ou WebP. Maximum {{ readableMaxSize }}. Les dimensions sont lues automatiquement.</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onFileSelected">
          <span v-if="selectedFile" class="mt-1 break-all text-xs text-coursia-primary">{{ selectedFile.name }}</span>
        </label>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-white/70 md:col-span-2">
            Recette
            <select
              v-model="form.recipeId"
              :disabled="loadingRecipes"
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary dark:border-white/10 dark:bg-[#101827] dark:text-white"
            >
              <option value="">{{ loadingRecipes ? 'Chargement...' : 'Sélectionner une recette' }}</option>
              <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
                {{ recipe.title || 'Recette sans titre' }} · {{ recipe.slug }}
              </option>
            </select>
            <span v-if="selectedRecipe" class="truncate text-[11px] font-medium text-[#667085] dark:text-white/50">{{ selectedRecipe.id }}</span>
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-white/70">
            Nom de fichier
            <input v-model="form.fileName" required readonly class="rounded-xl border border-[#e6e1d8] bg-[#fbfaf7] px-3 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-white/70">
            Type
            <input v-model="form.mimeType" readonly class="rounded-xl border border-[#e6e1d8] bg-[#fbfaf7] px-3 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-white/70">
            Taille
            <input :value="`${Math.round(form.sizeBytes / 1024)} Ko`" readonly class="rounded-xl border border-[#e6e1d8] bg-[#fbfaf7] px-3 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054] dark:text-white/70">
            Dimensions
            <input :value="`${form.width} × ${form.height}`" readonly class="rounded-xl border border-[#e6e1d8] bg-[#fbfaf7] px-3 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-white/5 dark:text-white">
          </label>
        </div>

        <section class="mt-5 rounded-2xl bg-[#fbfaf7] p-4 dark:bg-white/5">
          <h3 class="text-sm font-semibold text-[#101828] dark:text-white">Recadrage</h3>
          <div class="mt-3 grid grid-cols-4 gap-2">
            <label class="grid gap-1 text-xs text-[#667085] dark:text-white/50">X<input v-model.number="form.crop.x" type="number" min="0" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-[#101827] dark:text-white"></label>
            <label class="grid gap-1 text-xs text-[#667085] dark:text-white/50">Y<input v-model.number="form.crop.y" type="number" min="0" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-[#101827] dark:text-white"></label>
            <label class="grid gap-1 text-xs text-[#667085] dark:text-white/50">L<input v-model.number="form.crop.width" type="number" min="0.01" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-[#101827] dark:text-white"></label>
            <label class="grid gap-1 text-xs text-[#667085] dark:text-white/50">H<input v-model.number="form.crop.height" type="number" min="0.01" max="1" step="0.01" class="rounded-xl border border-[#e6e1d8] bg-white px-2 py-2 text-sm dark:border-white/10 dark:bg-[#101827] dark:text-white"></label>
          </div>
          <p class="mt-3 text-xs text-[#667085] dark:text-white/50">
            Zone : {{ cropPercent.x }}%, {{ cropPercent.y }}%, {{ cropPercent.width }}% × {{ cropPercent.height }}%.
          </p>
        </section>

        <section class="mt-5 rounded-2xl border border-[#e6e1d8] p-4 dark:border-white/10">
          <h3 class="text-sm font-semibold text-[#101828] dark:text-white">Droits et accessibilité</h3>
          <div class="mt-3 grid gap-3">
            <input v-model="form.rights.author" required placeholder="Auteur" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary dark:border-white/10 dark:bg-[#101827] dark:text-white">
            <input v-model="form.rights.source" required placeholder="Source" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary dark:border-white/10 dark:bg-[#101827] dark:text-white">
            <input v-model="form.rights.license" required placeholder="Licence" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary dark:border-white/10 dark:bg-[#101827] dark:text-white">
            <label class="flex cursor-pointer items-center gap-3 text-sm text-[#344054] dark:text-white/70">
              <input v-model="form.rights.consentConfirmed" required type="checkbox">
              Consentement confirmé
            </label>
            <input v-model="form.altText" placeholder="Texte alternatif avant publication" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary dark:border-white/10 dark:bg-[#101827] dark:text-white">
          </div>
        </section>

        <div v-if="validationIssues.length" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-xs text-coursia-danger">
          <p v-for="issue in validationIssues" :key="issue">{{ issue }}</p>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <BaseButton type="submit" :disabled="saving || !canUpload">
            {{ saving ? 'Import...' : 'Importer dans Storage' }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" @click="publishMedia">Publier</BaseButton>
          <BaseButton type="button" variant="ghost" @click="replaceMedia">Remplacer par ce fichier</BaseButton>
        </div>
      </form>

      <aside class="grid gap-5">
        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <h2 class="text-sm font-semibold text-[#101828] dark:text-white">Aperçu média</h2>
          <div class="mt-4 overflow-hidden rounded-2xl bg-[#fbfaf7] dark:bg-white/5">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="form.altText || 'Aperçu du média recette'"
              class="aspect-[4/3] w-full object-cover"
            >
            <div v-else class="grid aspect-[4/3] place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.20),transparent_30%),linear-gradient(135deg,#fff7ed,#eef7f2)] text-sm text-[#667085] dark:text-white/50">
              Aucun fichier sélectionné
            </div>
          </div>
          <p class="mt-3 text-xs text-[#667085] dark:text-white/50">
            Le fichier est d’abord privé, puis copié dans le bucket public lors de la publication.
          </p>
        </article>

        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 dark:border-white/10 dark:bg-white/5">
          <h2 class="text-sm font-semibold text-[#101828] dark:text-white">Renditions prévues</h2>
          <div class="mt-4 grid gap-3">
            <div v-for="rendition in renditionPreview" :key="rendition.name" class="rounded-2xl bg-[#fbfaf7] p-4 dark:bg-white/5">
              <div class="flex items-center justify-between gap-3">
                <span class="font-semibold text-[#101828] dark:text-white">{{ rendition.name }}</span>
                <BaseBadge tone="neutral">{{ rendition.width }}×{{ rendition.height }}</BaseBadge>
              </div>
              <p class="mt-2 break-all text-xs text-[#667085] dark:text-white/50">{{ rendition.path }}</p>
            </div>
          </div>
        </article>
      </aside>
    </div>

    <section class="admin-table mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white dark:border-white/10 dark:bg-white/5">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4 dark:border-white/10">
        <div>
          <h2 class="text-sm font-semibold text-[#101828] dark:text-white">Fichiers orphelins</h2>
          <p class="mt-1 text-xs text-[#667085] dark:text-white/50">Fichiers sans recette ou marqués orphelins avant nettoyage.</p>
        </div>
        <BaseBadge tone="warning">{{ orphanAssets.length }}</BaseBadge>
      </div>

      <div v-if="orphanAssets.length === 0" class="p-5 text-sm text-[#667085] dark:text-white/50">
        Aucun fichier orphelin chargé.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#eee8df] text-sm dark:divide-white/10">
          <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085] dark:bg-white/5 dark:text-white/50">
            <tr>
              <th class="px-5 py-3">Chemin privé</th>
              <th class="px-5 py-3">Recette</th>
              <th class="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df] dark:divide-white/10">
            <tr v-for="asset in orphanAssets" :key="String(asset.id)" class="transition hover:bg-[#fbfaf7] dark:hover:bg-white/5">
              <td class="px-5 py-4 font-medium text-[#101828] dark:text-white">{{ asset.private_path || asset.path || asset.id }}</td>
              <td class="px-5 py-4 text-[#667085] dark:text-white/50">{{ asset.recipe_id || '—' }}</td>
              <td class="px-5 py-4"><BaseBadge tone="warning">{{ asset.status || 'orphaned' }}</BaseBadge></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
