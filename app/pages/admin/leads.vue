<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type ContactStatus = 'new' | 'reviewed' | 'archived'
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type ContactLead = {
  id: string
  name: string
  email: string
  reason: string
  message: string
  source: string
  status: ContactStatus
  internal_note: string | null
  created_at: string
  updated_at: string
  consented_at: string | null
}

type WaitlistLead = {
  id: string
  email: string
  source: string | null
  household_size: number | null
  interests: string[]
  created_at: string | null
  updated_at: string
  consented_at: string | null
}

const filters = reactive({
  search: '',
  status: '',
  limit: 50,
})

const contacts = ref<ContactLead[]>([])
const waitlist = ref<WaitlistLead[]>([])
const selectedContactId = ref('')
const noteDraft = ref('')
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const selectedContact = computed(() =>
  contacts.value.find((lead) => lead.id === selectedContactId.value) ?? contacts.value[0] ?? null,
)

const contactCount = computed(() => contacts.value.length)
const waitlistCount = computed(() => waitlist.value.length)
const totalLeads = computed(() => contactCount.value + waitlistCount.value)
const newContactsCount = computed(() => contacts.value.filter((lead) => lead.status === 'new').length)
const reviewedContactsCount = computed(() => contacts.value.filter((lead) => lead.status === 'reviewed').length)
const archivedContactsCount = computed(() => contacts.value.filter((lead) => lead.status === 'archived').length)
const consentedWaitlistCount = computed(() => waitlist.value.filter((lead) => Boolean(lead.consented_at)).length)

const waitlistSources = computed(() => {
  const sources = waitlist.value.reduce<Record<string, number>>((acc, lead) => {
    const source = lead.source || 'inconnue'
    acc[source] = (acc[source] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(sources)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
})

const latestLeadDate = computed(() => {
  const dates = [
    ...contacts.value.map((lead) => lead.created_at),
    ...waitlist.value.map((lead) => lead.created_at),
  ].filter((value): value is string => Boolean(value))

  if (dates.length <= 0) return '—'

  return formatDate(dates.sort().at(-1) ?? null)
})

const selectedContactAge = computed(() => {
  if (!selectedContact.value) return '—'
  return formatRelativeDate(selectedContact.value.created_at)
})

const statusLabel: Record<ContactStatus, string> = {
  new: 'Nouveau',
  reviewed: 'Traité',
  archived: 'Archivé',
}

const statusTone = (status: ContactStatus): BadgeTone => {
  if (status === 'new') return 'warning'
  if (status === 'reviewed') return 'success'
  return 'neutral'
}

const sourceLabel = (value: string | null) => value || 'inconnue'

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatRelativeDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000))
  if (diffMinutes < 60) return `${diffMinutes} min`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 48) return `${diffHours} h`

  return `${Math.round(diffHours / 24)} j`
}

watch(selectedContact, (contact) => {
  noteDraft.value = contact?.internal_note ?? ''
}, { immediate: true })

const loadLeads = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{
      data: {
        contacts: ContactLead[]
        waitlist: WaitlistLead[]
      }
    }>('/api/admin/leads', {
      query: {
        search: filters.search.trim() || undefined,
        status: filters.status || undefined,
        limit: filters.limit,
      },
    })

    contacts.value = response.data.contacts
    waitlist.value = response.data.waitlist

    if (!contacts.value.some((lead) => lead.id === selectedContactId.value)) {
      selectedContactId.value = contacts.value[0]?.id ?? ''
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les leads.'
  } finally {
    isLoading.value = false
  }
}

const updateSelectedContactLocally = (updated: ContactLead) => {
  contacts.value = contacts.value.map((lead) => lead.id === updated.id ? updated : lead)
  selectedContactId.value = updated.id
}

const patchContact = async (lead: ContactLead, payload: { status?: ContactStatus, internalNote?: string }) => {
  isSaving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: ContactLead }>(`/api/admin/leads/${lead.id}`, {
      method: 'PATCH',
      body: payload,
    })

    updateSelectedContactLocally(response.data)
    feedback.value = 'Lead mis à jour.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de mettre à jour ce lead.'
  } finally {
    isSaving.value = false
  }
}

const markAsReviewed = (lead: ContactLead) => patchContact(lead, { status: 'reviewed' })
const archiveLead = (lead: ContactLead) => patchContact(lead, { status: 'archived' })
const reopenLead = (lead: ContactLead) => patchContact(lead, { status: 'new' })

const saveNote = async () => {
  if (!selectedContact.value) return
  await patchContact(selectedContact.value, { internalNote: noteDraft.value })
}

const scheduleReload = () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    void loadLeads()
  }, 220)
}

watch(() => [filters.search, filters.status, filters.limit], scheduleReload)

onMounted(() => {
  void loadLeads()
})

onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-92</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Leads publics
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Suivi des messages de contact et des inscriptions à la liste d’attente.
          Les contacts peuvent être qualifiés, annotés puis archivés. La liste d’attente reste en lecture contrôlée.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <BaseBadge tone="neutral">{{ latestLeadDate }}</BaseBadge>
        <BaseButton type="button" :disabled="isLoading" @click="loadLeads">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <form class="admin-toolbar grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_10rem_auto]" @submit.prevent="loadLeads">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Recherche
        <input
          v-model="filters.search"
          type="search"
          placeholder="Email, nom, source ou sujet"
          autocomplete="off"
        >
      </label>

      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Statut contact
        <select v-model="filters.status">
          <option value="">Tous</option>
          <option value="new">Nouveaux</option>
          <option value="reviewed">Traités</option>
          <option value="archived">Archivés</option>
        </select>
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
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ totalLeads }}</p>
        <p class="mt-1 text-xs text-coursia-muted">contacts + waitlist</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">À traiter</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ newContactsCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">contacts nouveaux</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Traités</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ reviewedContactsCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">suivi effectué</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Waitlist</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ waitlistCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">{{ consentedWaitlistCount }} consentements</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Archivés</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ archivedContactsCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">hors flux actif</p>
      </article>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-coursia-text">Messages de contact</h2>
            <p class="mt-1 text-xs text-coursia-muted">
              Sélectionne une ligne pour gérer le suivi sans exposer plus de données que nécessaire.
            </p>
          </div>
          <BaseBadge tone="neutral">{{ contactCount }}</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">Chargement des contacts...</div>
        <div v-else-if="contacts.length <= 0" class="p-5 text-sm text-coursia-muted">Aucun contact trouvé.</div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-coursia-border text-sm">
            <thead>
              <tr>
                <th class="px-5 py-3">Contact</th>
                <th class="px-5 py-3">Sujet</th>
                <th class="px-5 py-3">Message</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-coursia-border">
              <tr
                v-for="lead in contacts"
                :key="lead.id"
                class="cursor-pointer transition hover:bg-coursia-background"
                :class="selectedContact?.id === lead.id ? 'bg-coursia-background' : ''"
                @click="selectedContactId = lead.id"
              >
                <td class="px-5 py-4">
                  <p class="font-semibold text-coursia-text">{{ lead.name }}</p>
                  <p class="mt-1 text-xs text-coursia-muted">{{ lead.email }}</p>
                  <p class="mt-1 text-[11px] uppercase tracking-[0.12em] text-coursia-muted">
                    {{ sourceLabel(lead.source) }}
                  </p>
                </td>
                <td class="px-5 py-4 text-coursia-muted">{{ lead.reason }}</td>
                <td class="max-w-xl px-5 py-4">
                  <p class="line-clamp-2 leading-6 text-coursia-muted">{{ lead.message }}</p>
                  <BaseBadge v-if="lead.internal_note" class="mt-2" tone="primary">Note interne</BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="statusTone(lead.status)">
                    {{ statusLabel[lead.status] }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <div class="flex flex-wrap gap-2" @click.stop>
                    <button
                      v-if="lead.status !== 'reviewed'"
                      type="button"
                      class="cursor-pointer rounded-lg border border-coursia-success/25 bg-coursia-success/10 px-2.5 py-1.5 text-xs font-bold text-coursia-success transition hover:bg-coursia-success/15 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="isSaving"
                      @click="markAsReviewed(lead)"
                    >
                      Traiter
                    </button>
                    <button
                      v-if="lead.status !== 'archived'"
                      type="button"
                      class="cursor-pointer rounded-lg border border-coursia-border bg-coursia-surface px-2.5 py-1.5 text-xs font-bold text-coursia-muted transition hover:bg-coursia-background disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="isSaving"
                      @click="archiveLead(lead)"
                    >
                      Archiver
                    </button>
                    <button
                      v-if="lead.status === 'archived'"
                      type="button"
                      class="cursor-pointer rounded-lg border border-coursia-border bg-coursia-surface px-2.5 py-1.5 text-xs font-bold text-coursia-muted transition hover:bg-coursia-background disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="isSaving"
                      @click="reopenLead(lead)"
                    >
                      Réouvrir
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <div v-if="selectedContact">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Suivi</p>
              <h2 class="mt-2 text-lg font-semibold text-coursia-text">{{ selectedContact.name }}</h2>
              <p class="mt-1 text-sm text-coursia-muted">{{ selectedContact.email }}</p>
            </div>
            <BaseBadge :tone="statusTone(selectedContact.status)">
              {{ statusLabel[selectedContact.status] }}
            </BaseBadge>
          </div>

          <dl class="mt-5 grid gap-3 text-sm">
            <div class="rounded-2xl bg-coursia-background p-4">
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Sujet</dt>
              <dd class="mt-1 font-semibold text-coursia-text">{{ selectedContact.reason }}</dd>
            </div>

            <div class="rounded-2xl bg-coursia-background p-4">
              <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Message</dt>
              <dd class="mt-2 whitespace-pre-wrap leading-6 text-coursia-muted">{{ selectedContact.message }}</dd>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl bg-coursia-background p-4">
                <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Reçu</dt>
                <dd class="mt-1 text-coursia-text">{{ selectedContactAge }}</dd>
              </div>
              <div class="rounded-2xl bg-coursia-background p-4">
                <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Consentement</dt>
                <dd class="mt-1 text-coursia-text">{{ selectedContact.consented_at ? 'Oui' : 'Non' }}</dd>
              </div>
            </div>
          </dl>

          <label class="mt-5 grid gap-2 text-sm font-semibold text-coursia-text">
            Note interne
            <textarea
              v-model="noteDraft"
              maxlength="2000"
              rows="6"
              placeholder="Contexte, prochaine action, réponse envoyée..."
            />
          </label>

          <div class="mt-4 flex flex-wrap gap-2">
            <BaseButton type="button" :disabled="isSaving" @click="saveNote">
              {{ isSaving ? 'Enregistrement...' : 'Sauver la note' }}
            </BaseButton>
            <BaseButton
              v-if="selectedContact.status !== 'reviewed'"
              type="button"
              variant="secondary"
              :disabled="isSaving"
              @click="markAsReviewed(selectedContact)"
            >
              Marquer traité
            </BaseButton>
            <BaseButton
              v-if="selectedContact.status !== 'archived'"
              type="button"
              variant="ghost"
              :disabled="isSaving"
              @click="archiveLead(selectedContact)"
            >
              Archiver
            </BaseButton>
            <BaseButton
              v-if="selectedContact.status === 'archived'"
              type="button"
              variant="ghost"
              :disabled="isSaving"
              @click="reopenLead(selectedContact)"
            >
              Réouvrir
            </BaseButton>
          </div>
        </div>

        <div v-else class="rounded-2xl bg-coursia-background p-5 text-sm text-coursia-muted">
          Aucun contact sélectionné.
        </div>
      </aside>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-coursia-text">Liste d’attente</h2>
            <p class="mt-1 text-xs text-coursia-muted">
              Source, foyer et intérêts déclarés. Pas de modification directe depuis cette page.
            </p>
          </div>
          <BaseBadge tone="neutral">{{ waitlistCount }}</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">Chargement de la liste d’attente...</div>
        <div v-else-if="waitlist.length <= 0" class="p-5 text-sm text-coursia-muted">Aucune inscription trouvée.</div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-coursia-border text-sm">
            <thead>
              <tr>
                <th class="px-5 py-3">Email</th>
                <th class="px-5 py-3">Source</th>
                <th class="px-5 py-3">Foyer</th>
                <th class="px-5 py-3">Intérêts</th>
                <th class="px-5 py-3">Inscription</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-coursia-border">
              <tr v-for="lead in waitlist" :key="lead.id" class="transition hover:bg-coursia-background">
                <td class="px-5 py-4 font-semibold text-coursia-text">{{ lead.email }}</td>
                <td class="px-5 py-4 text-coursia-muted">{{ sourceLabel(lead.source) }}</td>
                <td class="px-5 py-4 text-coursia-muted">{{ lead.household_size ?? '—' }}</td>
                <td class="px-5 py-4">
                  <div class="flex max-w-md flex-wrap gap-1.5">
                    <BaseBadge v-for="interest in lead.interests" :key="interest" tone="neutral">
                      {{ interest }}
                    </BaseBadge>
                    <span v-if="lead.interests.length <= 0" class="text-coursia-muted">—</span>
                  </div>
                </td>
                <td class="px-5 py-4 text-coursia-muted">{{ formatDate(lead.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Acquisition</p>
        <h2 class="mt-2 text-lg font-semibold text-coursia-text">Sources waitlist</h2>
        <p class="mt-2 text-sm text-coursia-muted">
          Vue rapide pour comprendre quels CTA publics créent le plus d’inscriptions.
        </p>

        <div class="mt-5 grid gap-3">
          <div
            v-for="[source, count] in waitlistSources"
            :key="source"
            class="flex items-center justify-between rounded-2xl bg-coursia-background px-4 py-3"
          >
            <span class="text-sm font-semibold text-coursia-text">{{ source }}</span>
            <BaseBadge tone="neutral">{{ count }}</BaseBadge>
          </div>

          <div v-if="waitlistSources.length <= 0" class="rounded-2xl bg-coursia-background p-4 text-sm text-coursia-muted">
            Aucune source chargée.
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
