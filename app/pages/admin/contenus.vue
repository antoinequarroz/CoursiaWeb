<script setup lang="ts">
import type { ContentEntryInput } from '#shared/validation/content-settings'

definePageMeta({
  layout: 'admin',
})

type ContentKind = ContentEntryInput['kind']
type ContentStatus = ContentEntryInput['status']
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type ContentRecord = {
  id: string
  key: string
  kind: ContentKind
  title: string
  body: string | null
  url: string | null
  locale: string
  status: ContentStatus
  publish_at: string | null
  archive_at: string | null
  archived_at?: string | null
  metadata?: Record<string, string> | null
  created_at?: string | null
  updated_at?: string | null
}

type HistoryRecord = {
  id: string
  content_entry_id?: string | null
  author_user_id?: string | null
  authorUserId?: string | null
  change_summary?: string | null
  changeSummary?: string | null
  created_at?: string | null
  createdAt?: string | null
}

type PreviewRecord = {
  title: string
  body: string
  url: string | null
  kind: ContentKind
  status: ContentStatus
  visibility: 'visible' | 'preview_only'
  schedule: {
    publishAt: string | null
    archiveAt: string | null
  }
}

const route = useRoute()

const filters = reactive({
  kind: '',
  status: '',
  search: '',
  limit: 50,
})

const createEmptyForm = (): ContentEntryInput => ({
  key: '',
  kind: 'faq',
  title: '',
  body: '',
  url: undefined,
  locale: 'fr-CH',
  status: 'draft',
  publishAt: undefined,
  archiveAt: undefined,
  metadata: {},
})

const form = reactive<ContentEntryInput>(createEmptyForm())

const contents = ref<ContentRecord[]>([])
const history = ref<HistoryRecord[]>([])
const preview = ref<PreviewRecord | null>(null)
const selectedContentId = ref('')
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
let filterDebounce: ReturnType<typeof setTimeout> | null = null

const kindLabels: Record<ContentKind, string> = {
  faq: 'FAQ',
  marketing_text: 'Marketing',
  link: 'Lien',
  announcement: 'Annonce',
}

const kindDescriptions: Record<ContentKind, string> = {
  faq: 'Question, réponse et aide publique.',
  marketing_text: 'Texte court utilisé par les pages publiques.',
  link: 'Lien contrôlé visible dans le site ou l’application.',
  announcement: 'Message temporaire avec période de publication.',
}

const statusLabels: Record<ContentStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
  archived: 'Archivé',
}

const selectedContent = computed(() =>
  contents.value.find((content) => content.id === selectedContentId.value) ?? null,
)

const publishedCount = computed(() => contents.value.filter((content) => content.status === 'published').length)
const scheduledCount = computed(() => contents.value.filter((content) => content.status === 'scheduled').length)
const draftCount = computed(() => contents.value.filter((content) => content.status === 'draft').length)
const archivedCount = computed(() => contents.value.filter((content) => content.status === 'archived').length)

const kindStats = computed(() => {
  const stats = contents.value.reduce<Record<ContentKind, number>>((acc, content) => {
    acc[content.kind] = (acc[content.kind] ?? 0) + 1
    return acc
  }, {
    faq: 0,
    marketing_text: 0,
    link: 0,
    announcement: 0,
  })

  return Object.entries(stats) as [ContentKind, number][]
})

const statusTone = (status: unknown): BadgeTone => {
  if (status === 'published') return 'success'
  if (status === 'scheduled') return 'warning'
  if (status === 'archived') return 'neutral'
  return 'primary'
}

const kindTone = (kind: unknown): BadgeTone => {
  if (kind === 'faq') return 'primary'
  if (kind === 'announcement') return 'warning'
  if (kind === 'link') return 'neutral'
  return 'success'
}

const formatDate = (value: unknown) => {
  if (!value || typeof value !== 'string') return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const toIsoDateTime = (value?: string) => {
  if (!value) return undefined
  return new Date(value).toISOString()
}

const toLocalDateTimeInput = (value?: string | null) => {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16)
}

const resetMessages = () => {
  feedback.value = ''
  errorMessage.value = ''
}

const resetForm = () => {
  selectedContentId.value = ''
  preview.value = null
  history.value = []
  Object.assign(form, createEmptyForm())
}

const applyContentToForm = (content: ContentRecord) => {
  selectedContentId.value = content.id
  form.key = content.key
  form.kind = content.kind
  form.title = content.title
  form.body = content.body ?? ''
  form.url = content.url ?? undefined
  form.locale = content.locale
  form.status = content.status
  form.publishAt = toLocalDateTimeInput(content.publish_at)
  form.archiveAt = toLocalDateTimeInput(content.archive_at)
  form.metadata = content.metadata ?? {}
}

const loadContents = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ContentRecord[] }>('/api/admin/content', {
      query: {
        kind: filters.kind || undefined,
        status: filters.status || undefined,
        search: filters.search.trim() || undefined,
        limit: filters.limit,
      },
    })

    contents.value = response.data

    const querySelected = typeof route.query.selected === 'string' ? route.query.selected : ''
    const targetId = selectedContentId.value || querySelected
    const nextSelected = contents.value.find((content) => content.id === targetId) ?? contents.value[0] ?? null

    if (nextSelected && !selectedContentId.value) {
      applyContentToForm(nextSelected)
      await loadHistory()
    } else if (selectedContentId.value && !contents.value.some((content) => content.id === selectedContentId.value)) {
      resetForm()
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les contenus.'
  } finally {
    isLoading.value = false
  }
}

const loadHistory = async () => {
  try {
    const response = await $fetch<{ data: HistoryRecord[] }>('/api/admin/content/history', {
      query: selectedContentId.value ? { contentEntryId: selectedContentId.value } : {},
    })
    history.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger l’historique.'
  }
}

const selectContent = async (content: ContentRecord) => {
  resetMessages()
  preview.value = null
  applyContentToForm(content)
  await loadHistory()
}

const saveContent = async () => {
  isSaving.value = true
  resetMessages()

  const endpoint = selectedContentId.value ? `/api/admin/content/${selectedContentId.value}` : '/api/admin/content'
  const body = {
    ...form,
    body: form.body || undefined,
    url: form.url || undefined,
    publishAt: toIsoDateTime(form.publishAt),
    archiveAt: toIsoDateTime(form.archiveAt),
  }

  try {
    const response = await $fetch<{ data: ContentRecord }>(endpoint, {
      method: selectedContentId.value ? 'PUT' : 'POST',
      body,
    })

    feedback.value = selectedContentId.value
      ? 'Contenu modifié et historisé.'
      : 'Contenu créé et historisé.'

    selectedContentId.value = response.data.id
    await Promise.all([loadContents(), loadHistory()])
    applyContentToForm(response.data)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’enregistrer le contenu.'
  } finally {
    isSaving.value = false
  }
}

const previewContent = async () => {
  resetMessages()

  if (!selectedContentId.value) {
    errorMessage.value = 'Sélectionne ou enregistre un contenu avant de générer un aperçu.'
    return
  }

  try {
    const response = await $fetch<{ data: PreviewRecord }>(`/api/admin/content/${selectedContentId.value}/preview`)
    preview.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de générer l’aperçu.'
  }
}

const archiveContent = async () => {
  resetMessages()

  if (!selectedContentId.value) {
    errorMessage.value = 'Sélectionne un contenu avant archivage.'
    return
  }

  try {
    const response = await $fetch<{ data: ContentRecord }>(`/api/admin/content/${selectedContentId.value}/archive`, {
      method: 'POST',
    })
    feedback.value = 'Contenu archivé et audité.'
    await Promise.all([loadContents(), loadHistory()])
    applyContentToForm(response.data)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’archiver le contenu.'
  }
}

const scheduleFilterReload = () => {
  if (filterDebounce) clearTimeout(filterDebounce)

  filterDebounce = setTimeout(() => {
    void loadContents()
  }, 220)
}

watch(() => [filters.kind, filters.status, filters.search, filters.limit], scheduleFilterReload)

onMounted(() => {
  void Promise.all([loadContents(), loadHistory()])
})

onBeforeUnmount(() => {
  if (filterDebounce) clearTimeout(filterDebounce)
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-106</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Contenus administrables
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          FAQ, textes marketing, liens et annonces modifiables sans redéploiement.
          Les secrets, jetons et paramètres techniques restent explicitement hors de ce module.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="resetForm">
          Nouveau contenu
        </BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadContents">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <form class="admin-toolbar grid gap-3 lg:grid-cols-[12rem_12rem_minmax(0,1fr)_10rem_auto]" @submit.prevent="loadContents">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Type
        <select v-model="filters.kind">
          <option value="">Tous</option>
          <option value="faq">FAQ</option>
          <option value="marketing_text">Marketing</option>
          <option value="link">Liens</option>
          <option value="announcement">Annonces</option>
        </select>
      </label>

      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Statut
        <select v-model="filters.status">
          <option value="">Tous</option>
          <option value="draft">Brouillon</option>
          <option value="scheduled">Planifié</option>
          <option value="published">Publié</option>
          <option value="archived">Archivé</option>
        </select>
      </label>

      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Recherche
        <input
          v-model="filters.search"
          type="search"
          placeholder="Titre, clé, contenu..."
          autocomplete="off"
        >
      </label>

      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Limite
        <select v-model.number="filters.limit">
          <option :value="25">25 lignes</option>
          <option :value="50">50 lignes</option>
          <option :value="100">100 lignes</option>
        </select>
      </label>

      <BaseButton class="self-end" type="submit" :disabled="isLoading">
        Appliquer
      </BaseButton>
    </form>

    <div v-if="feedback || errorMessage" class="grid gap-3">
      <p
        v-if="feedback"
        class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-medium text-coursia-success"
      >
        {{ feedback }}
      </p>
      <p
        v-if="errorMessage"
        class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-medium text-coursia-danger"
      >
        {{ errorMessage }}
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Total</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ contents.length }}</p>
        <p class="mt-1 text-xs text-coursia-muted">contenus filtrés</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Publiés</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ publishedCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">visibles côté produit</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Planifiés</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ scheduledCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">publication future</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Brouillons</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ draftCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">non publiés</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Archivés</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ archivedCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">hors ligne</p>
      </article>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-coursia-text">Bibliothèque de contenus</h2>
            <p class="mt-1 text-xs text-coursia-muted">
              Sélectionne une ligne pour l’éditer, générer un aperçu ou consulter son historique.
            </p>
          </div>
          <BaseBadge tone="neutral">Sans redéploiement</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">Chargement des contenus...</div>
        <div v-else-if="contents.length === 0" class="p-5 text-sm text-coursia-muted">Aucun contenu trouvé.</div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-coursia-border text-sm">
            <thead>
              <tr>
                <th class="px-5 py-3">Contenu</th>
                <th class="px-5 py-3">Type</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3">Publication</th>
                <th class="px-5 py-3">Mise à jour</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-coursia-border">
              <tr
                v-for="content in contents"
                :key="content.id"
                class="cursor-pointer transition hover:bg-coursia-background"
                :class="selectedContentId === content.id ? 'bg-coursia-background' : ''"
                @click="selectContent(content)"
              >
                <td class="px-5 py-4">
                  <p class="font-semibold text-coursia-text">{{ content.title }}</p>
                  <p class="mt-1 text-xs text-coursia-muted">{{ content.key }}</p>
                  <p v-if="content.url" class="mt-1 max-w-[22rem] truncate text-xs text-coursia-primary">
                    {{ content.url }}
                  </p>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="kindTone(content.kind)">
                    {{ kindLabels[content.kind] }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="statusTone(content.status)">
                    {{ statusLabels[content.status] }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4 text-coursia-muted">{{ formatDate(content.publish_at) }}</td>
                <td class="px-5 py-4 text-coursia-muted">{{ formatDate(content.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form
        class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm"
        @submit.prevent="saveContent"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">
              {{ selectedContentId ? 'Édition' : 'Création' }}
            </p>
            <h2 class="mt-2 text-lg font-semibold text-coursia-text">
              {{ selectedContentId ? form.title || 'Contenu sélectionné' : 'Nouveau contenu' }}
            </h2>
            <p class="mt-1 text-sm text-coursia-muted">{{ kindDescriptions[form.kind] }}</p>
          </div>
          <BaseBadge :tone="statusTone(form.status)">
            {{ statusLabels[form.status] }}
          </BaseBadge>
        </div>

        <div class="mt-5 grid gap-4">
          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Clé publique non sensible
            <input
              v-model="form.key"
              required
              placeholder="faq-pricing-family"
              autocomplete="off"
            >
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Type
              <select v-model="form.kind">
                <option value="faq">FAQ</option>
                <option value="marketing_text">Texte marketing</option>
                <option value="link">Lien</option>
                <option value="announcement">Annonce</option>
              </select>
            </label>

            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Statut
              <select v-model="form.status">
                <option value="draft">Brouillon</option>
                <option value="scheduled">Planifié</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </label>
          </div>

          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Titre
            <input v-model="form.title" required placeholder="Titre affiché">
          </label>

          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Texte
            <textarea
              v-model="form.body"
              rows="7"
              placeholder="Contenu visible par l’utilisateur. Aucun secret, token ou identifiant sensible."
            />
          </label>

          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            URL
            <input v-model="form.url" type="url" placeholder="https://...">
          </label>

          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Publication
              <input v-model="form.publishAt" type="datetime-local">
            </label>

            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Archivage
              <input v-model="form.archiveAt" type="datetime-local">
            </label>
          </div>
        </div>

        <div class="mt-5 rounded-2xl bg-coursia-background p-4 text-xs leading-5 text-coursia-muted">
          Les clés contenant secret, token, password, private, service_role, api_key, dsn ou credential sont refusées côté serveur.
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <BaseButton type="submit" :disabled="isSaving">
            {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" @click="previewContent">
            Aperçu
          </BaseButton>
          <BaseButton type="button" variant="ghost" @click="archiveContent">
            Archiver
          </BaseButton>
          <BaseButton v-if="selectedContentId" type="button" variant="ghost" @click="resetForm">
            Annuler
          </BaseButton>
        </div>
      </form>
    </div>

    <section class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Aperçu</p>
            <h2 class="mt-2 text-lg font-semibold text-coursia-text">
              {{ preview?.title ?? selectedContent?.title ?? 'Aucun aperçu généré' }}
            </h2>
          </div>
          <BaseBadge :tone="statusTone(preview?.status ?? selectedContent?.status)">
            {{ preview ? statusLabels[preview.status] : 'Preview' }}
          </BaseBadge>
        </div>

        <div v-if="preview" class="mt-5 rounded-2xl bg-coursia-background p-5">
          <div class="flex flex-wrap gap-2">
            <BaseBadge :tone="kindTone(preview.kind)">{{ kindLabels[preview.kind] }}</BaseBadge>
            <BaseBadge :tone="preview.visibility === 'visible' ? 'success' : 'neutral'">
              {{ preview.visibility === 'visible' ? 'Visible' : 'Prévisualisation' }}
            </BaseBadge>
          </div>
          <p class="mt-4 whitespace-pre-wrap text-sm leading-6 text-coursia-muted">{{ preview.body || '—' }}</p>
          <p v-if="preview.url" class="mt-4 break-all text-sm font-medium text-coursia-primary">
            {{ preview.url }}
          </p>
          <dl class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-coursia-border bg-coursia-surface p-4">
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Publication</dt>
              <dd class="mt-1 text-sm text-coursia-text">{{ formatDate(preview.schedule.publishAt) }}</dd>
            </div>
            <div class="rounded-2xl border border-coursia-border bg-coursia-surface p-4">
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Archivage</dt>
              <dd class="mt-1 text-sm text-coursia-text">{{ formatDate(preview.schedule.archiveAt) }}</dd>
            </div>
          </dl>
        </div>

        <div v-else class="mt-5 rounded-2xl bg-coursia-background p-5 text-sm text-coursia-muted">
          Sélectionne un contenu puis clique sur “Aperçu” pour vérifier le rendu serveur.
        </div>
      </article>

      <aside class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Types</p>
        <h2 class="mt-2 text-lg font-semibold text-coursia-text">Répartition</h2>
        <p class="mt-2 text-sm text-coursia-muted">
          Contrôle rapide des familles de contenus actuellement filtrées.
        </p>

        <div class="mt-5 grid gap-3">
          <div
            v-for="[kind, count] in kindStats"
            :key="kind"
            class="flex items-center justify-between rounded-2xl bg-coursia-background px-4 py-3"
          >
            <span class="text-sm font-semibold text-coursia-text">{{ kindLabels[kind] }}</span>
            <BaseBadge :tone="kindTone(kind)">{{ count }}</BaseBadge>
          </div>
        </div>
      </aside>
    </section>

    <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-coursia-text">Historique auteur</h2>
          <p class="mt-1 text-xs text-coursia-muted">
            Traçabilité des modifications du contenu sélectionné.
          </p>
        </div>
        <BaseBadge tone="neutral">{{ history.length }}</BaseBadge>
      </div>

      <div v-if="history.length === 0" class="p-5 text-sm text-coursia-muted">Aucun historique chargé.</div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-coursia-border text-sm">
          <thead>
            <tr>
              <th class="px-5 py-3">Date</th>
              <th class="px-5 py-3">Auteur</th>
              <th class="px-5 py-3">Résumé</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-coursia-border">
            <tr v-for="revision in history" :key="revision.id" class="transition hover:bg-coursia-background">
              <td class="px-5 py-4 text-coursia-muted">{{ formatDate(revision.created_at ?? revision.createdAt) }}</td>
              <td class="px-5 py-4 text-coursia-muted">{{ revision.author_user_id ?? revision.authorUserId ?? '—' }}</td>
              <td class="px-5 py-4 font-medium text-coursia-text">
                {{ revision.change_summary ?? revision.changeSummary ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
