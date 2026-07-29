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
const canUpload = computed(() => Boolean(selectedFile.value && validationIssues.value.length === 0))
const formattedFileSize = computed(() => form.sizeBytes > 0 ? `${Math.round(form.sizeBytes / 1024)} Ko` : '—')
const selectedMediaLabel = computed(() => selectedMediaId.value ? selectedMediaId.value.slice(0, 8) : 'Non importé')
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
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-99</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
          Photos de recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Importe une image réelle dans Supabase Storage, vérifie les droits, puis publie uniquement le média validé.
        </p>
      </div>

      <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadOrphans">
        {{ loading ? 'Chargement...' : 'Actualiser les orphelins' }}
      </BaseButton>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article class="admin-stat-card">
        <span>Statut</span>
        <strong class="text-base">
          <BaseBadge :tone="statusTone(form.status)">{{ form.status }}</BaseBadge>
        </strong>
      </article>
      <article class="admin-stat-card">
        <span>Dimensions</span>
        <strong>{{ form.width }}×{{ form.height }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Renditions</span>
        <strong>{{ recipeMediaRenditions.length }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Orphelins</span>
        <strong class="text-coursia-warning">{{ orphanAssets.length }}</strong>
      </article>
    </div>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <form class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm" @submit.prevent="uploadMedia()">
        <div class="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Validation privée</p>
            <h2 class="mt-1 text-lg font-black text-coursia-foreground">Image et métadonnées</h2>
            <p class="mt-2 text-sm text-coursia-muted">
              Le fichier reste privé tant que les droits et l’accessibilité ne sont pas validés.
            </p>
          </div>
          <BaseBadge tone="neutral">{{ selectedMediaLabel }}</BaseBadge>
        </div>

        <label class="mt-4 grid cursor-pointer gap-2 rounded-2xl border border-dashed border-coursia-border bg-coursia-surface-muted p-5 text-sm text-coursia-muted transition hover:border-coursia-primary">
          <span class="font-black text-coursia-foreground">Importer une photo</span>
          <span>JPEG, PNG ou WebP. Maximum {{ readableMaxSize }}. Dimensions lues automatiquement.</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onFileSelected">
          <span v-if="selectedFile" class="mt-1 break-all text-xs font-bold text-coursia-primary">{{ selectedFile.name }}</span>
        </label>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground md:col-span-2">
            Recette
            <select v-model="form.recipeId" :disabled="loadingRecipes">
              <option value="">{{ loadingRecipes ? 'Chargement...' : 'Sélectionner une recette' }}</option>
              <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
                {{ recipe.title || 'Recette sans titre' }} · {{ recipe.slug }}
              </option>
            </select>
            <span v-if="selectedRecipe" class="truncate text-xs font-medium text-coursia-muted">{{ selectedRecipe.id }}</span>
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Nom de fichier
            <input v-model="form.fileName" required readonly>
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Type
            <input v-model="form.mimeType" readonly>
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Taille
            <input :value="formattedFileSize" readonly>
          </label>
          <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
            Dimensions
            <input :value="`${form.width} × ${form.height}`" readonly>
          </label>
        </div>

        <section class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
          <h3 class="text-sm font-black text-coursia-foreground">Recadrage</h3>
          <div class="mt-3 grid grid-cols-4 gap-2">
            <label class="grid gap-1 text-xs font-bold text-coursia-muted">
              X
              <input v-model.number="form.crop.x" type="number" min="0" max="1" step="0.01">
            </label>
            <label class="grid gap-1 text-xs font-bold text-coursia-muted">
              Y
              <input v-model.number="form.crop.y" type="number" min="0" max="1" step="0.01">
            </label>
            <label class="grid gap-1 text-xs font-bold text-coursia-muted">
              L
              <input v-model.number="form.crop.width" type="number" min="0.01" max="1" step="0.01">
            </label>
            <label class="grid gap-1 text-xs font-bold text-coursia-muted">
              H
              <input v-model.number="form.crop.height" type="number" min="0.01" max="1" step="0.01">
            </label>
          </div>
          <p class="mt-3 text-xs text-coursia-muted">
            Zone : {{ cropPercent.x }}%, {{ cropPercent.y }}%, {{ cropPercent.width }}% × {{ cropPercent.height }}%.
          </p>
        </section>

        <section class="mt-4 rounded-2xl border border-coursia-border p-4">
          <h3 class="text-sm font-black text-coursia-foreground">Droits et accessibilité</h3>
          <div class="mt-3 grid gap-3">
            <input v-model="form.rights.author" required placeholder="Auteur">
            <input v-model="form.rights.source" required placeholder="Source">
            <input v-model="form.rights.license" required placeholder="Licence">
            <label class="flex cursor-pointer items-center gap-3 text-sm font-semibold text-coursia-foreground">
              <input v-model="form.rights.consentConfirmed" required type="checkbox" class="h-4 w-4 accent-coursia-primary">
              Consentement confirmé
            </label>
            <input v-model="form.altText" placeholder="Texte alternatif avant publication">
          </div>
        </section>

        <div v-if="validationIssues.length" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-xs font-semibold text-coursia-danger">
          <p v-for="issue in validationIssues" :key="issue">{{ issue }}</p>
        </div>

        <div class="mt-4 flex flex-wrap gap-2 border-t border-coursia-border pt-4">
          <BaseButton type="submit" :disabled="saving || !canUpload">
            {{ saving ? 'Import...' : 'Importer dans Storage' }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" @click="publishMedia">Publier</BaseButton>
          <BaseButton type="button" variant="ghost" @click="replaceMedia">Remplacer</BaseButton>
        </div>
      </form>

      <aside class="grid gap-4">
        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-black text-coursia-foreground">Aperçu média</h2>
          <div class="mt-4 overflow-hidden rounded-2xl bg-coursia-surface-muted">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="form.altText || 'Aperçu du média recette'"
              class="aspect-[4/3] w-full object-cover"
            >
            <div v-else class="grid aspect-[4/3] place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.18),transparent_30%),linear-gradient(135deg,#fff7ed,#eef7f2)] text-sm text-coursia-muted dark:bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.18),transparent_30%),linear-gradient(135deg,#17231f,#111827)]">
              Aucun fichier sélectionné
            </div>
          </div>
          <p class="mt-3 text-xs leading-5 text-coursia-muted">
            Publication = copie vers le bucket public avec texte alternatif obligatoire.
          </p>
        </article>

        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-black text-coursia-foreground">Renditions prévues</h2>
          <div class="mt-4 grid gap-3">
            <div v-for="rendition in renditionPreview" :key="rendition.name" class="rounded-2xl bg-coursia-surface-muted p-3">
              <div class="flex items-center justify-between gap-3">
                <span class="font-black text-coursia-foreground">{{ rendition.name }}</span>
                <BaseBadge tone="neutral">{{ rendition.width }}×{{ rendition.height }}</BaseBadge>
              </div>
              <p class="mt-2 break-all text-xs text-coursia-muted">{{ rendition.path }}</p>
            </div>
          </div>
        </article>
      </aside>
    </div>

    <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
      <div class="flex flex-col justify-between gap-3 border-b border-coursia-border px-4 py-3 md:flex-row md:items-center">
        <div>
          <h2 class="text-base font-black text-coursia-foreground">Fichiers orphelins</h2>
          <p class="mt-1 text-xs text-coursia-muted">Fichiers sans recette ou marqués orphelins avant nettoyage.</p>
        </div>
        <BaseBadge tone="warning">{{ orphanAssets.length }}</BaseBadge>
      </div>

      <div v-if="orphanAssets.length === 0" class="p-5 text-sm text-coursia-muted">
        Aucun fichier orphelin chargé.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-[48rem]">
          <thead>
            <tr>
              <th>Chemin privé</th>
              <th>Recette</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in orphanAssets" :key="String(asset.id)">
              <td class="font-semibold text-coursia-foreground">{{ asset.private_path || asset.path || asset.id }}</td>
              <td class="text-sm text-coursia-muted">{{ asset.recipe_id || '—' }}</td>
              <td>
                <BaseBadge tone="warning">{{ asset.status || 'orphaned' }}</BaseBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
