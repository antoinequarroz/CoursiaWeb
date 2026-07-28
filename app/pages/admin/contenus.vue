<script setup lang="ts">
import type { ContentEntryInput } from '#shared/validation/content-settings'

definePageMeta({
  layout: 'admin',
})

type ContentRecord = Record<string, unknown>
type HistoryRecord = Record<string, unknown>
type ContentKind = ContentEntryInput['kind']
type ContentStatus = ContentEntryInput['status']
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const filters = reactive({
  kind: '',
  status: '',
  search: '',
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
const preview = ref<ContentRecord | null>(null)
const selectedContentId = ref('')
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

const kindLabels: Record<ContentKind, string> = {
  faq: 'FAQ',
  marketing_text: 'Marketing',
  link: 'Lien',
  announcement: 'Annonce',
}

const statusLabels: Record<ContentStatus, string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
  archived: 'Archivé',
}

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

const publishedCount = computed(() => contents.value.filter((content) => content.status === 'published').length)
const scheduledCount = computed(() => contents.value.filter((content) => content.status === 'scheduled').length)
const archivedCount = computed(() => contents.value.filter((content) => content.status === 'archived').length)

const toIsoDateTime = (value?: string) => {
  if (!value) return undefined
  return new Date(value).toISOString()
}

const toLocalDateTimeInput = (value?: string) => {
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
  Object.assign(form, createEmptyForm())
}

const loadContents = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ContentRecord[] }>('/api/admin/content', {
      query: filters,
    })
    contents.value = response.data
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

const saveContent = async () => {
  isSaving.value = true
  resetMessages()

  const route = selectedContentId.value ? `/api/admin/content/${selectedContentId.value}` : '/api/admin/content'
  const body = {
    ...form,
    publishAt: toIsoDateTime(form.publishAt),
    archiveAt: toIsoDateTime(form.archiveAt),
  }

  try {
    await $fetch(route, {
      method: selectedContentId.value ? 'PUT' : 'POST',
      body,
    })
    feedback.value = 'Contenu enregistré sans redéploiement et historisé avec auteur.'
    await Promise.all([loadContents(), loadHistory()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’enregistrer le contenu.'
  } finally {
    isSaving.value = false
  }
}

const selectContent = (content: ContentRecord) => {
  selectedContentId.value = String(content.id)
  form.key = String(content.key ?? '')
  form.kind = String(content.kind ?? 'faq') as ContentKind
  form.title = String(content.title ?? '')
  form.body = String(content.body ?? '')
  form.url = content.url ? String(content.url) : undefined
  form.locale = String(content.locale ?? 'fr-CH')
  form.status = String(content.status ?? 'draft') as ContentStatus
  form.publishAt = toLocalDateTimeInput(content.publish_at ? String(content.publish_at) : undefined)
  form.archiveAt = toLocalDateTimeInput(content.archive_at ? String(content.archive_at) : undefined)
  void loadHistory()
}

const previewContent = async () => {
  resetMessages()

  if (!selectedContentId.value) {
    errorMessage.value = 'Sélectionne un contenu pour afficher un aperçu.'
    return
  }

  try {
    const response = await $fetch<{ data: ContentRecord }>(`/api/admin/content/${selectedContentId.value}/preview`)
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
    await $fetch(`/api/admin/content/${selectedContentId.value}/archive`, { method: 'POST' })
    feedback.value = 'Archivage programmé et audité.'
    await Promise.all([loadContents(), loadHistory()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’archiver le contenu.'
  }
}

watch(filters, () => {
  void loadContents()
})

onMounted(() => {
  void Promise.all([loadContents(), loadHistory()])
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-106</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Contenus administrables
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          FAQ, textes marketing, liens et annonces modifiables sans redéploiement. Les secrets et
          paramètres techniques restent exclus de ce module.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="resetForm">Nouveau contenu</BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadContents">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Total</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ contents.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">contenus filtrés</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Publiés</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ publishedCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">visibles</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Planifiés</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ scheduledCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">à publier</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Archivés</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ archivedCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">hors ligne</p>
      </article>
    </div>

    <div class="admin-toolbar mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1.4fr]">
      <select v-model="filters.kind" class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
        <option value="">Tous contenus</option>
        <option value="faq">FAQ</option>
        <option value="marketing_text">Textes marketing</option>
        <option value="link">Liens</option>
        <option value="announcement">Annonces</option>
      </select>
      <select v-model="filters.status" class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="scheduled">Planifié</option>
        <option value="published">Publié</option>
        <option value="archived">Archivé</option>
      </select>
      <input v-model="filters.search" placeholder="Recherche titre ou clé" class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section class="admin-table overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
        <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#101828]">Contenus</h2>
            <p class="mt-1 text-xs text-[#667085]">Sélectionne une ligne pour éditer ou prévisualiser.</p>
          </div>
          <BaseBadge tone="neutral">Sans redéploiement</BaseBadge>
        </div>
        <div v-if="isLoading" class="p-5 text-sm text-[#667085]">Chargement des contenus...</div>
        <div v-else-if="contents.length === 0" class="p-5 text-sm text-[#667085]">
          Aucun contenu trouvé.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#eee8df] text-sm">
            <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
              <tr>
                <th class="px-5 py-3">Contenu</th>
                <th class="px-5 py-3">Type</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3">Publication</th>
                <th class="px-5 py-3">Archivage</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eee8df]">
              <tr
                v-for="content in contents"
                :key="String(content.id)"
                class="cursor-pointer transition hover:bg-[#fbfaf7]"
                :class="selectedContentId === String(content.id) ? 'bg-[#f1f7f4]' : ''"
                @click="selectContent(content)"
              >
                <td class="px-5 py-4">
                  <span class="block font-semibold text-[#101828]">{{ content.title }}</span>
                  <span class="mt-1 block text-xs text-[#667085]">{{ content.key }}</span>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="kindTone(content.kind)">
                    {{ kindLabels[String(content.kind) as ContentKind] ?? content.kind }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="statusTone(content.status)">
                    {{ statusLabels[String(content.status) as ContentStatus] ?? content.status }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4 text-[#667085]">{{ content.publish_at || '—' }}</td>
                <td class="px-5 py-4 text-[#667085]">{{ content.archive_at || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]" @submit.prevent="saveContent">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">
              {{ selectedContentId ? 'Édition' : 'Création' }}
            </p>
            <h2 class="mt-2 text-lg font-semibold text-[#101828]">Contenu non technique</h2>
          </div>
          <BaseButton v-if="selectedContentId" type="button" size="sm" variant="ghost" @click="resetForm">Annuler</BaseButton>
        </div>

        <div class="mt-5 grid gap-4">
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Clé publique non sensible
            <input v-model="form.key" required class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Type
              <select v-model="form.kind" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
                <option value="faq">FAQ</option>
                <option value="marketing_text">Texte marketing</option>
                <option value="link">Lien</option>
                <option value="announcement">Annonce</option>
              </select>
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Statut
              <select v-model="form.status" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
                <option value="draft">Brouillon</option>
                <option value="scheduled">Planifié</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
            </label>
          </div>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Titre
            <input v-model="form.title" required class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Texte
            <textarea v-model="form.body" rows="6" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary" />
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            URL pour les liens
            <input v-model="form.url" type="url" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Publication
              <input v-model="form.publishAt" type="datetime-local" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            </label>
            <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
              Archivage
              <input v-model="form.archiveAt" type="datetime-local" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            </label>
          </div>
        </div>

        <div class="mt-5 rounded-2xl bg-[#fbfaf7] p-4 text-xs text-[#667085]">
          Les clés contenant secret, token, password, private, service_role ou api_key sont refusées côté serveur.
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <BaseButton type="submit" :disabled="isSaving">
            {{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" @click="previewContent">Aperçu</BaseButton>
          <BaseButton type="button" variant="ghost" @click="archiveContent">Archiver</BaseButton>
        </div>
      </form>
    </div>

    <section class="mt-6 grid gap-6 lg:grid-cols-2">
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-[#101828]">Aperçu</h2>
            <p class="mt-1 text-xs text-[#667085]">Rendu serveur du contenu sélectionné.</p>
          </div>
          <BaseBadge :tone="statusTone(preview?.status)">{{ preview?.status ?? '—' }}</BaseBadge>
        </div>
        <div v-if="preview" class="mt-4 rounded-2xl bg-[#fbfaf7] p-5">
          <h3 class="text-lg font-semibold text-[#101828]">{{ preview.title }}</h3>
          <p class="mt-3 whitespace-pre-wrap text-sm text-[#667085]">{{ preview.body }}</p>
          <p v-if="preview.url" class="mt-4 break-all text-sm font-medium text-coursia-primary">{{ preview.url }}</p>
        </div>
        <p v-else class="mt-4 rounded-2xl bg-[#fbfaf7] p-4 text-sm text-[#667085]">
          Aucun aperçu généré.
        </p>
      </article>

      <article class="admin-table overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
        <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#101828]">Historique auteur</h2>
            <p class="mt-1 text-xs text-[#667085]">Traçabilité des modifications.</p>
          </div>
          <BaseBadge tone="neutral">{{ history.length }}</BaseBadge>
        </div>
        <div v-if="history.length === 0" class="p-5 text-sm text-[#667085]">Aucun historique chargé.</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#eee8df] text-sm">
            <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
              <tr>
                <th class="px-5 py-3">Date</th>
                <th class="px-5 py-3">Auteur</th>
                <th class="px-5 py-3">Résumé</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eee8df]">
              <tr v-for="revision in history" :key="String(revision.id)" class="transition hover:bg-[#fbfaf7]">
                <td class="px-5 py-4 text-[#667085]">{{ revision.created_at || revision.createdAt || '—' }}</td>
                <td class="px-5 py-4 text-[#667085]">{{ revision.author_user_id || revision.authorUserId || '—' }}</td>
                <td class="px-5 py-4 font-medium text-[#101828]">{{ revision.change_summary || revision.changeSummary || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </section>
</template>
