<script setup lang="ts">
import type { ContentEntryInput } from '#shared/validation/content-settings'

definePageMeta({
  layout: 'admin',
})

const filters = reactive({
  kind: '',
  status: '',
  search: '',
})

const form = reactive<ContentEntryInput>({
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

const contents = ref<Array<Record<string, unknown>>>([])
const history = ref<Array<Record<string, unknown>>>([])
const preview = ref<Record<string, unknown> | null>(null)
const selectedContentId = ref('')
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

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

const loadContents = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/content', {
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
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/content/history', {
      query: selectedContentId.value ? { contentEntryId: selectedContentId.value } : {},
    })
    history.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger l historique.'
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
    feedback.value = 'Contenu enregistre sans redeploiement et historise avec auteur.'
    await Promise.all([loadContents(), loadHistory()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d enregistrer le contenu.'
  } finally {
    isSaving.value = false
  }
}

const selectContent = (content: Record<string, unknown>) => {
  selectedContentId.value = String(content.id)
  form.key = String(content.key ?? '')
  form.kind = String(content.kind ?? 'faq') as ContentEntryInput['kind']
  form.title = String(content.title ?? '')
  form.body = String(content.body ?? '')
  form.url = content.url ? String(content.url) : undefined
  form.locale = String(content.locale ?? 'fr-CH')
  form.status = String(content.status ?? 'draft') as ContentEntryInput['status']
  form.publishAt = toLocalDateTimeInput(content.publish_at ? String(content.publish_at) : undefined)
  form.archiveAt = toLocalDateTimeInput(content.archive_at ? String(content.archive_at) : undefined)
}

const previewContent = async () => {
  resetMessages()

  if (!selectedContentId.value) {
    feedback.value = 'Selectionne un contenu pour afficher un apercu.'
    return
  }

  try {
    const response = await $fetch<{ data: Record<string, unknown> }>(`/api/admin/content/${selectedContentId.value}/preview`)
    preview.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de generer l apercu.'
  }
}

const archiveContent = async () => {
  resetMessages()

  if (!selectedContentId.value) {
    feedback.value = 'Selectionne un contenu avant archivage.'
    return
  }

  try {
    await $fetch(`/api/admin/content/${selectedContentId.value}/archive`, { method: 'POST' })
    feedback.value = 'Archivage programme et audite.'
    await Promise.all([loadContents(), loadHistory()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d archiver le contenu.'
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
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-106</p>
        <h1 class="mt-2 text-3xl font-black">Contenus administrables</h1>
        <p class="mt-3 max-w-3xl text-coursia-muted">
          FAQ, textes marketing, liens et annonces peuvent etre modifies sans redeployer.
          Les dates de publication, archivage, apercu et historique auteur sont geres ici.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="loadHistory">Historique</BaseButton>
        <BaseButton type="button" @click="loadContents">Rafraichir</BaseButton>
      </div>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-3">
      <select v-model="filters.kind" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous contenus</option>
        <option value="faq">FAQ</option>
        <option value="marketing_text">Textes marketing</option>
        <option value="link">Liens</option>
        <option value="announcement">Annonces</option>
      </select>
      <select v-model="filters.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="scheduled">Planifie</option>
        <option value="published">Publie</option>
        <option value="archived">Archive</option>
      </select>
      <input v-model="filters.search" placeholder="Recherche titre ou cle" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>
    <p v-if="errorMessage" class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{{ errorMessage }}</p>

    <section class="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-2xl font-black">FAQ, marketing, liens et annonces</h2>
        <p v-if="isLoading" class="mt-5 text-sm text-coursia-muted">Chargement des contenus...</p>
        <p v-else-if="contents.length === 0" class="mt-5 text-sm text-coursia-muted">Aucun contenu trouve. Le seed doit afficher des exemples si la session admin est valide.</p>
        <div class="mt-5 grid gap-4">
          <button
            v-for="content in contents"
            :key="String(content.id)"
            type="button"
            class="rounded-2xl border border-coursia-border bg-coursia-background p-4 text-left"
            @click="selectContent(content)"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-black">{{ content.title }}</h3>
              <span class="rounded-full bg-coursia-surface-muted px-3 py-1 text-xs font-black">
                {{ content.kind }} - {{ content.status }}
              </span>
            </div>
            <p class="mt-2 text-sm text-coursia-muted">
              Publication {{ content.publish_at || 'non planifiee' }} - archivage {{ content.archive_at || 'non planifie' }}
            </p>
            <p class="mt-2 text-xs text-coursia-muted">Cle {{ content.key }} - URL {{ content.url || '-' }}</p>
          </button>
        </div>
      </article>

      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveContent">
        <h2 class="text-2xl font-black">Edition non technique</h2>
        <label class="mt-5 grid gap-2 text-sm font-bold">
          Cle publique non sensible
          <input v-model="form.key" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Type
          <select v-model="form.kind" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
            <option value="faq">FAQ</option>
            <option value="marketing_text">Texte marketing</option>
            <option value="link">Lien</option>
            <option value="announcement">Annonce</option>
          </select>
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Titre
          <input v-model="form.title" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Texte
          <textarea v-model="form.body" rows="5" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          URL pour les liens
          <input v-model="form.url" type="url" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <label class="grid gap-2 text-sm font-bold">
            Publication
            <input v-model="form.publishAt" type="datetime-local" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="grid gap-2 text-sm font-bold">
            Archivage
            <input v-model="form.archiveAt" type="datetime-local" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
        </div>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Statut
          <select v-model="form.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
            <option value="draft">Brouillon</option>
            <option value="scheduled">Planifie</option>
            <option value="published">Publie</option>
            <option value="archived">Archive</option>
          </select>
        </label>
        <p class="mt-4 text-sm text-coursia-muted">
          Parametres techniques et secrets hors module : pas de token, password, service_role ou API key.
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <BaseButton type="submit" :disabled="isSaving">{{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}</BaseButton>
          <BaseButton type="button" variant="secondary" @click="previewContent">Apercu</BaseButton>
          <BaseButton type="button" variant="ghost" @click="archiveContent">Archiver</BaseButton>
        </div>
      </form>
    </section>

    <section class="mt-8 grid gap-5 lg:grid-cols-2">
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Apercu</h2>
        <pre class="mt-4 overflow-auto rounded-2xl bg-coursia-background p-4 text-sm">{{ preview }}</pre>
      </article>
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-xl font-black">Historique auteur</h2>
        <div class="mt-4 grid gap-3">
          <div v-for="revision in history" :key="String(revision.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
            {{ revision.created_at }} - auteur {{ revision.author_user_id }} - {{ revision.change_summary }}
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
