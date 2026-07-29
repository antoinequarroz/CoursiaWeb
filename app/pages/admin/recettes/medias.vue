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

type OrphanAsset = {
  id?: string | number | null
  recipe_id?: string | null
  private_path?: string | null
  path?: string | null
  status?: RecipeMediaMetadata['status'] | string | null
  width?: number | null
  height?: number | null
  size_bytes?: number | null
  updated_at?: string | null
}

const route = useRoute()
const router = useRouter()

const createEmptyForm = (): RecipeMediaMetadata => ({
  recipeId: typeof route.query.recipeId === 'string' ? route.query.recipeId : '',
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

const form = reactive<RecipeMediaMetadata>(createEmptyForm())
const feedback = ref('')
const errorMessage = ref('')
const selectedMediaId = ref('')
const orphanAssets = ref<OrphanAsset[]>([])
const recipes = ref<RecipeOption[]>([])
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const loading = ref(false)
const loadingRecipes = ref(true)
const saving = ref(false)

const readableMaxSize = computed(() => `${Math.round(recipeMediaMaxBytes / 1024 / 1024)} Mo`)
const renditionPreview = computed(() => buildRecipeMediaRenditions(form.fileName || 'photo-recette.webp'))
const selectedRecipe = computed(() => recipes.value.find((recipe) => recipe.id === form.recipeId) ?? null)
const selectedMediaLabel = computed(() => selectedMediaId.value ? selectedMediaId.value.slice(0, 8) : 'En attente')
const formattedFileSize = computed(() => formatBytes(form.sizeBytes))

const cropPercent = computed(() => ({
  x: Math.round(form.crop.x * 100),
  y: Math.round(form.crop.y * 100),
  width: Math.round(form.crop.width * 100),
  height: Math.round(form.crop.height * 100),
}))

const mediaStats = computed(() => [
  { label: 'Formats', value: 'JPEG · PNG · WebP', tone: 'primary' as BadgeTone },
  { label: 'Poids maximal', value: readableMaxSize.value, tone: 'neutral' as BadgeTone },
  { label: 'Renditions', value: String(recipeMediaRenditions.length), tone: 'success' as BadgeTone },
  { label: 'Orphelins', value: String(orphanAssets.value.length), tone: orphanAssets.value.length > 0 ? 'warning' as BadgeTone : 'success' as BadgeTone },
])

const validationIssues = computed(() => {
  const issues: string[] = []

  if (!selectedFile.value) issues.push('Sélectionne une image.')
  if (!form.recipeId) issues.push('Associe le média à une recette.')
  if (!recipeMediaAllowedTypes.includes(form.mimeType)) issues.push('Le type de fichier n’est pas autorisé.')
  if (form.sizeBytes > recipeMediaMaxBytes) issues.push(`Le fichier dépasse ${readableMaxSize.value}.`)
  if (form.width < recipeMediaDimensions.minWidth || form.height < recipeMediaDimensions.minHeight) {
    issues.push(`Dimensions minimales : ${recipeMediaDimensions.minWidth}×${recipeMediaDimensions.minHeight}.`)
  }
  if (form.width > recipeMediaDimensions.maxWidth || form.height > recipeMediaDimensions.maxHeight) {
    issues.push(`Dimensions maximales : ${recipeMediaDimensions.maxWidth}×${recipeMediaDimensions.maxHeight}.`)
  }
  if (!form.rights.author.trim()) issues.push('Auteur obligatoire.')
  if (!form.rights.source.trim()) issues.push('Source obligatoire.')
  if (!form.rights.license.trim()) issues.push('Licence obligatoire.')
  if (!form.rights.consentConfirmed) issues.push('Consentement requis.')
  if (form.status === 'published' && !form.altText?.trim()) issues.push('Texte alternatif requis avant publication.')

  return issues
})

const rightsComplete = computed(() =>
  Boolean(
    form.rights.author.trim()
    && form.rights.source.trim()
    && form.rights.license.trim()
    && form.rights.consentConfirmed,
  ),
)

const canUpload = computed(() => Boolean(selectedFile.value && validationIssues.value.length === 0))

const workflowSteps = computed(() => [
  { label: 'Image', done: Boolean(selectedFile.value), detail: selectedFile.value?.name ?? 'Aucun fichier sélectionné' },
  { label: 'Recette', done: Boolean(form.recipeId), detail: selectedRecipe.value?.title ?? 'Aucune recette associée' },
  { label: 'Droits', done: rightsComplete.value, detail: rightsComplete.value ? form.rights.license : 'Auteur, source, licence et consentement' },
  { label: 'Accessibilité', done: Boolean(form.altText?.trim()), detail: form.altText || 'Texte alternatif avant publication' },
])

function statusTone(status: RecipeMediaMetadata['status'] | string | null | undefined): BadgeTone {
  if (status === 'published') return 'success'
  if (status === 'validation') return 'warning'
  if (status === 'replaced') return 'neutral'
  if (status === 'orphaned') return 'danger'

  return 'neutral'
}

function formatBytes(value: number | null | undefined) {
  const bytes = Number(value ?? 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
  return `${Math.round(bytes / 1024)} Ko`
}

function formatDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
}

function clearMessages() {
  feedback.value = ''
  errorMessage.value = ''
}

function setPreviewUrl(file: File) {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  previewUrl.value = URL.createObjectURL(file)
}

function readImageDimensions(file: File) {
  return new Promise<{ width: number, height: number }>((resolve, reject) => {
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
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  clearMessages()

  if (!file) {
    selectedFile.value = null
    return
  }

  selectedFile.value = file
  form.fileName = file.name
  form.mimeType = file.type as RecipeMediaMetadata['mimeType']
  form.sizeBytes = file.size
  form.status = 'validation'
  selectedMediaId.value = ''
  setPreviewUrl(file)

  try {
    const dimensions = await readImageDimensions(file)
    form.width = dimensions.width
    form.height = dimensions.height
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Lecture image impossible.'
  }
}

async function loadRecipes() {
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

async function uploadMedia(replaceOfId?: string) {
  if (!selectedFile.value) {
    feedback.value = ''
    errorMessage.value = 'Sélectionne une image avant l’import.'
    return false
  }

  if (validationIssues.value.length > 0) {
    feedback.value = ''
    errorMessage.value = 'Corrige les métadonnées avant l’import.'
    return false
  }

  saving.value = true
  clearMessages()

  try {
    const payload = new FormData()
    payload.append('file', selectedFile.value)
    payload.append('metadata', JSON.stringify(form))
    if (replaceOfId) {
      payload.append('replaceOfId', replaceOfId)
    }

    const response = await $fetch<{ data: { id: string, private_path: string } }>('/api/admin/recipes/media/upload', {
      method: 'POST',
      body: payload,
    })

    selectedMediaId.value = response.data.id
    form.status = 'validation'
    feedback.value = replaceOfId
      ? `Nouveau média importé. Ancien média ${replaceOfId.slice(0, 8)} marqué comme remplacé.`
      : `Média importé dans le bucket privé : ${response.data.private_path}`

    await loadOrphans()
    return true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Import impossible.'
    return false
  } finally {
    saving.value = false
  }
}

async function publishMedia() {
  if (!selectedMediaId.value) {
    errorMessage.value = 'Importe un média avant publication.'
    return
  }

  if (!form.altText?.trim()) {
    errorMessage.value = 'Ajoute un texte alternatif avant publication.'
    return
  }

  saving.value = true
  clearMessages()

  try {
    await $fetch(`/api/admin/recipes/media/${selectedMediaId.value}/publish`, {
      method: 'POST',
      body: { altText: form.altText },
    })
    form.status = 'published'
    feedback.value = 'Média publié dans le bucket public avec texte alternatif.'
    await loadOrphans()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Publication impossible.'
  } finally {
    saving.value = false
  }
}

async function replaceMedia() {
  if (!selectedMediaId.value) {
    errorMessage.value = 'Importe un média avant remplacement.'
    return
  }

  await uploadMedia(selectedMediaId.value)
}

async function loadOrphans() {
  loading.value = true

  try {
    const response = await $fetch<{ data: OrphanAsset[] }>('/api/admin/recipes/media/orphans')
    orphanAssets.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les fichiers orphelins.'
  } finally {
    loading.value = false
  }
}

function resetWorkspace() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  Object.assign(form, createEmptyForm())
  form.recipeId = typeof route.query.recipeId === 'string'
    ? route.query.recipeId
    : recipes.value[0]?.id ?? ''
  selectedFile.value = null
  selectedMediaId.value = ''
  previewUrl.value = ''
  clearMessages()
}

watch(
  () => form.recipeId,
  (recipeId) => {
    void router.replace({
      query: {
        ...route.query,
        ...(recipeId ? { recipeId } : {}),
      },
    })
  },
)

onMounted(async () => {
  await loadRecipes()
  await loadOrphans()
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
        <p class="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-coursia-primary">
          COUR-99 · Supabase Storage
        </p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Médias de recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-coursia-muted">
          Importer, valider, publier et nettoyer les images utilisées par les fiches recettes web et mobile.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" :disabled="loading" @click="loadOrphans">
          {{ loading ? 'Chargement…' : 'Contrôler les orphelins' }}
        </BaseButton>
        <BaseButton type="button" variant="ghost" @click="resetWorkspace">
          Réinitialiser
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article v-for="stat in mediaStats" :key="stat.label" class="admin-stat-card">
        <span>{{ stat.label }}</span>
        <strong>
          <BaseBadge :tone="stat.tone">{{ stat.value }}</BaseBadge>
        </strong>
      </article>
    </div>

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

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <form
        class="rounded-3xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm"
        @submit.prevent="uploadMedia()"
      >
        <div class="flex flex-col justify-between gap-3 border-b border-coursia-border pb-4 md:flex-row md:items-start">
          <div>
            <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-coursia-primary">
              Pipeline privé → public
            </p>
            <h2 class="mt-2 text-lg font-semibold text-coursia-text">
              Image et métadonnées
            </h2>
            <p class="mt-1 text-sm text-coursia-muted">
              Le fichier reste dans le bucket de validation tant que les droits et l’accessibilité ne sont pas complets.
            </p>
          </div>
          <BaseBadge :tone="statusTone(form.status)">
            {{ form.status }} · {{ selectedMediaLabel }}
          </BaseBadge>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <label
            class="group grid cursor-pointer content-center gap-2 rounded-2xl border border-dashed border-coursia-border bg-coursia-surface-muted p-5 text-sm text-coursia-muted transition hover:border-coursia-primary hover:bg-coursia-primary/5"
          >
            <span class="font-semibold text-coursia-text">Déposer une image</span>
            <span>JPEG, PNG ou WebP · maximum {{ readableMaxSize }} · dimensions lues automatiquement.</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onFileSelected">
            <span v-if="selectedFile" class="mt-1 break-all text-xs font-semibold text-coursia-primary">
              {{ selectedFile.name }}
            </span>
          </label>

          <div class="overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface-muted">
            <img
              v-if="previewUrl"
              :src="previewUrl"
              :alt="form.altText || 'Aperçu du média recette'"
              class="aspect-[4/3] w-full object-cover"
            >
            <div
              v-else
              class="grid aspect-[4/3] place-items-center bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.16),transparent_30%),linear-gradient(135deg,rgba(255,247,237,0.9),rgba(238,247,242,0.9))] px-6 text-center text-sm text-coursia-muted dark:from-coursia-surface-muted dark:to-coursia-surface"
            >
              Aucun fichier sélectionné
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text md:col-span-2">
            Recette cible
            <select v-model="form.recipeId" :disabled="loadingRecipes">
              <option value="">{{ loadingRecipes ? 'Chargement…' : 'Sélectionner une recette' }}</option>
              <option v-for="recipe in recipes" :key="recipe.id" :value="recipe.id">
                {{ recipe.title || 'Recette sans titre' }} · {{ recipe.slug }}
              </option>
            </select>
            <span v-if="selectedRecipe" class="truncate text-xs font-medium text-coursia-muted">
              {{ selectedRecipe.status }} · {{ selectedRecipe.id }}
            </span>
          </label>

          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Nom de fichier
            <input v-model="form.fileName" readonly>
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Type MIME
            <input v-model="form.mimeType" readonly>
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Poids
            <input :value="formattedFileSize" readonly>
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Dimensions
            <input :value="`${form.width} × ${form.height}`" readonly>
          </label>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <section class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
            <h3 class="text-sm font-semibold text-coursia-text">Recadrage normalisé</h3>
            <div class="mt-3 grid grid-cols-4 gap-2">
              <label class="grid gap-1 text-xs font-semibold text-coursia-muted">
                X
                <input v-model.number="form.crop.x" type="number" min="0" max="1" step="0.01">
              </label>
              <label class="grid gap-1 text-xs font-semibold text-coursia-muted">
                Y
                <input v-model.number="form.crop.y" type="number" min="0" max="1" step="0.01">
              </label>
              <label class="grid gap-1 text-xs font-semibold text-coursia-muted">
                L
                <input v-model.number="form.crop.width" type="number" min="0.01" max="1" step="0.01">
              </label>
              <label class="grid gap-1 text-xs font-semibold text-coursia-muted">
                H
                <input v-model.number="form.crop.height" type="number" min="0.01" max="1" step="0.01">
              </label>
            </div>
            <p class="mt-3 text-xs leading-5 text-coursia-muted">
              Zone : {{ cropPercent.x }}%, {{ cropPercent.y }}%, {{ cropPercent.width }}% × {{ cropPercent.height }}%.
            </p>
          </section>

          <section class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
            <h3 class="text-sm font-semibold text-coursia-text">Checklist publication</h3>
            <div class="mt-3 grid gap-2">
              <div
                v-for="step in workflowSteps"
                :key="step.label"
                class="flex items-start gap-3 rounded-xl border border-coursia-border bg-coursia-surface px-3 py-2"
              >
                <span
                  class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-semibold"
                  :class="step.done ? 'bg-coursia-success/15 text-coursia-success' : 'bg-coursia-warning/15 text-coursia-warning'"
                >
                  {{ step.done ? '✓' : '!' }}
                </span>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold text-coursia-text">{{ step.label }}</span>
                  <span class="block truncate text-xs text-coursia-muted">{{ step.detail }}</span>
                </span>
              </div>
            </div>
          </section>
        </div>

        <section class="mt-4 rounded-2xl border border-coursia-border p-4">
          <h3 class="text-sm font-semibold text-coursia-text">Droits et accessibilité</h3>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <input v-model="form.rights.author" required placeholder="Auteur">
            <input v-model="form.rights.source" required placeholder="Source">
            <input v-model="form.rights.license" required placeholder="Licence">
            <label class="flex cursor-pointer items-center gap-3 text-sm font-semibold text-coursia-text md:col-span-3">
              <input v-model="form.rights.consentConfirmed" required type="checkbox" class="h-4 w-4 cursor-pointer accent-coursia-primary">
              Droits et consentement confirmés
            </label>
            <input v-model="form.altText" class="md:col-span-3" placeholder="Texte alternatif obligatoire avant publication">
          </div>
        </section>

        <div
          v-if="validationIssues.length"
          class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-xs font-semibold text-coursia-danger"
        >
          <p v-for="issue in validationIssues" :key="issue">{{ issue }}</p>
        </div>

        <div class="mt-4 flex flex-wrap gap-2 border-t border-coursia-border pt-4">
          <BaseButton type="submit" :disabled="saving || !canUpload">
            {{ saving ? 'Import…' : 'Importer en validation' }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" :disabled="saving || !selectedMediaId || !form.altText?.trim()" @click="publishMedia">
            Publier
          </BaseButton>
          <BaseButton type="button" variant="ghost" :disabled="saving || !selectedMediaId || !selectedFile" @click="replaceMedia">
            Remplacer
          </BaseButton>
        </div>
      </form>

      <aside class="grid gap-4">
        <article class="rounded-3xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-semibold text-coursia-text">Renditions générées</h2>
          <p class="mt-1 text-xs leading-5 text-coursia-muted">
            Ces chemins sont dérivés du schéma partagé, pas saisis à la main.
          </p>
          <div class="mt-4 grid gap-3">
            <div v-for="rendition in renditionPreview" :key="rendition.name" class="rounded-2xl bg-coursia-surface-muted p-3">
              <div class="flex items-center justify-between gap-3">
                <span class="font-semibold text-coursia-text">{{ rendition.name }}</span>
                <BaseBadge tone="neutral">{{ rendition.width }}×{{ rendition.height }}</BaseBadge>
              </div>
              <p class="mt-2 break-all text-xs text-coursia-muted">{{ rendition.path }}</p>
            </div>
          </div>
        </article>

        <article class="rounded-3xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-semibold text-coursia-text">Règle de publication</h2>
          <div class="mt-4 grid gap-3 text-sm">
            <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="font-semibold text-coursia-text">Validation privée</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">Bucket `recipe-media-validation`, réservé aux médias en contrôle.</p>
            </div>
            <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
              <p class="font-semibold text-coursia-text">Publication publique</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">Bucket `recipe-media-public`, uniquement après alt text et droits validés.</p>
            </div>
          </div>
        </article>
      </aside>
    </div>

    <section class="admin-table overflow-hidden rounded-3xl border border-coursia-border bg-coursia-surface">
      <div class="flex flex-col justify-between gap-3 border-b border-coursia-border px-4 py-3 md:flex-row md:items-center">
        <div>
          <h2 class="text-base font-semibold text-coursia-text">Fichiers orphelins</h2>
          <p class="mt-1 text-xs text-coursia-muted">
            Médias sans recette ou marqués orphelins. Ils ne doivent pas alimenter l’application.
          </p>
        </div>
        <BaseBadge :tone="orphanAssets.length > 0 ? 'warning' : 'success'">
          {{ loading ? 'Chargement' : `${orphanAssets.length} fichier(s)` }}
        </BaseBadge>
      </div>

      <div v-if="loading" class="p-5 text-sm text-coursia-muted">
        Chargement des fichiers orphelins…
      </div>
      <div v-else-if="orphanAssets.length === 0" class="grid place-items-center p-10 text-center">
        <div class="max-w-sm">
          <p class="font-semibold text-coursia-text">Aucun fichier orphelin</p>
          <p class="mt-2 text-sm text-coursia-muted">
            Le stockage est propre pour le périmètre actuellement contrôlé.
          </p>
        </div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-[54rem]">
          <thead>
            <tr>
              <th>Chemin</th>
              <th>Recette</th>
              <th>Image</th>
              <th>Statut</th>
              <th>Dernière mise à jour</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="asset in orphanAssets" :key="String(asset.id ?? asset.private_path ?? asset.path)">
              <td class="max-w-[22rem] truncate font-semibold text-coursia-text">
                {{ asset.private_path || asset.path || asset.id }}
              </td>
              <td class="text-sm text-coursia-muted">{{ asset.recipe_id || '—' }}</td>
              <td class="text-sm text-coursia-muted">
                {{ asset.width && asset.height ? `${asset.width}×${asset.height}` : '—' }} · {{ formatBytes(asset.size_bytes) }}
              </td>
              <td>
                <BaseBadge :tone="statusTone(asset.status)">{{ asset.status || 'orphaned' }}</BaseBadge>
              </td>
              <td class="text-sm text-coursia-muted">{{ formatDate(asset.updated_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
