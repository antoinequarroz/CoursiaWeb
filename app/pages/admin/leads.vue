<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type ContactStatus = 'new' | 'reviewed' | 'archived'

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
const archivedContactsCount = computed(() => contacts.value.filter((lead) => lead.status === 'archived').length)

const latestLeadDate = computed(() => {
  const dates = [
    ...contacts.value.map((lead) => lead.created_at),
    ...waitlist.value.map((lead) => lead.created_at),
  ].filter(Boolean) as string[]

  if (dates.length <= 0) {
    return '—'
  }

  return formatDate(dates.sort().at(-1) ?? null)
})

watch(selectedContact, (contact) => {
  noteDraft.value = contact?.internal_note ?? ''
}, { immediate: true })

const statusLabel: Record<ContactStatus, string> = {
  new: 'Nouveau',
  reviewed: 'Traité',
  archived: 'Archivé',
}

const statusTone = (status: ContactStatus) => {
  if (status === 'new') return 'warning'
  if (status === 'reviewed') return 'success'
  return 'neutral'
}

const formatDate = (value: string | null) => {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('fr-CH', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

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
        search: filters.search,
        status: filters.status,
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
  if (!selectedContact.value) {
    return
  }

  await patchContact(selectedContact.value, { internalNote: noteDraft.value })
}

watch(
  () => [filters.search, filters.status, filters.limit],
  () => {
    if (searchDebounce) {
      clearTimeout(searchDebounce)
    }

    searchDebounce = setTimeout(() => {
      void loadLeads()
    }, 220)
  },
)

onMounted(() => {
  void loadLeads()
})

onBeforeUnmount(() => {
  if (searchDebounce) {
    clearTimeout(searchDebounce)
  }
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">Leads publics</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Contacts et liste d’attente
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Les contacts deviennent un vrai flux de travail support : statut, note interne et audit.
          La liste d’attente reste en lecture seule pour préserver le consentement.
        </p>
      </div>

      <BaseButton type="button" :disabled="isLoading" @click="loadLeads">
        {{ isLoading ? 'Chargement…' : 'Rafraîchir' }}
      </BaseButton>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Total</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ totalLeads }}</p>
        <p class="mt-1 text-xs text-[#667085]">leads chargés</p>
      </article>
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">À traiter</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ newContactsCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">contacts nouveaux</p>
      </article>
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Archivés</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ archivedContactsCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">hors flux actif</p>
      </article>
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Dernier lead</p>
        <p class="mt-3 text-lg font-semibold text-[#101828]">{{ latestLeadDate }}</p>
        <p class="mt-1 text-xs text-[#667085]">contact ou inscription</p>
      </article>
    </div>

    <div class="mt-6 grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
      <input
        v-model="filters.search"
        type="search"
        placeholder="Rechercher par email, nom, source ou sujet"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      />
      <select
        v-model="filters.status"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      >
        <option value="">Tous statuts</option>
        <option value="new">Nouveaux</option>
        <option value="reviewed">Traités</option>
        <option value="archived">Archivés</option>
      </select>
      <select
        v-model.number="filters.limit"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      >
        <option :value="25">25 lignes</option>
        <option :value="50">50 lignes</option>
        <option :value="100">100 lignes</option>
      </select>
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section class="overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
        <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#101828]">Messages de contact</h2>
            <p class="mt-1 text-xs text-[#667085]">Clique une ligne pour gérer le suivi.</p>
          </div>
          <BaseBadge tone="neutral">{{ contactCount }}</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-[#667085]">Chargement des contacts…</div>
        <div v-else-if="contacts.length <= 0" class="p-5 text-sm text-[#667085]">Aucun contact trouvé.</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#eee8df] text-sm">
            <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
              <tr>
                <th class="px-5 py-3">Contact</th>
                <th class="px-5 py-3">Sujet</th>
                <th class="px-5 py-3">Message</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eee8df]">
              <tr
                v-for="lead in contacts"
                :key="lead.id"
                class="cursor-pointer transition hover:bg-[#fbfaf7]"
                :class="selectedContact?.id === lead.id ? 'bg-[#f1f7f4]' : ''"
                @click="selectedContactId = lead.id"
              >
                <td class="px-5 py-4">
                  <span class="block font-semibold text-[#101828]">{{ lead.name }}</span>
                  <span class="mt-1 block text-xs text-[#667085]">{{ lead.email }}</span>
                </td>
                <td class="px-5 py-4 text-[#344054]">{{ lead.reason }}</td>
                <td class="max-w-xl px-5 py-4">
                  <span class="line-clamp-2 text-[#667085]">{{ lead.message }}</span>
                  <span v-if="lead.internal_note" class="mt-1 block text-xs font-semibold text-coursia-primary">
                    Note interne présente
                  </span>
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
                      class="rounded-lg border border-[#d7eadc] bg-[#f1f8f3] px-2.5 py-1.5 text-xs font-bold text-[#0f5a3d] transition hover:bg-[#e4f2e8]"
                      :disabled="isSaving"
                      @click="markAsReviewed(lead)"
                    >
                      Traité
                    </button>
                    <button
                      v-if="lead.status !== 'archived'"
                      type="button"
                      class="rounded-lg border border-[#eee8df] bg-white px-2.5 py-1.5 text-xs font-bold text-[#667085] transition hover:bg-[#fbfaf7]"
                      :disabled="isSaving"
                      @click="archiveLead(lead)"
                    >
                      Archiver
                    </button>
                    <button
                      v-if="lead.status === 'archived'"
                      type="button"
                      class="rounded-lg border border-[#eee8df] bg-white px-2.5 py-1.5 text-xs font-bold text-[#667085] transition hover:bg-[#fbfaf7]"
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

      <aside class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <div v-if="selectedContact">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Suivi contact</p>
              <h2 class="mt-2 text-lg font-semibold text-[#101828]">{{ selectedContact.name }}</h2>
              <p class="mt-1 text-sm text-[#667085]">{{ selectedContact.email }}</p>
            </div>
            <BaseBadge :tone="statusTone(selectedContact.status)">
              {{ statusLabel[selectedContact.status] }}
            </BaseBadge>
          </div>

          <dl class="mt-5 grid gap-3 text-sm">
            <div class="rounded-xl bg-[#fbfaf7] p-3">
              <dt class="text-xs font-bold uppercase tracking-[0.12em] text-[#98a2b3]">Sujet</dt>
              <dd class="mt-1 font-semibold text-[#101828]">{{ selectedContact.reason }}</dd>
            </div>
            <div class="rounded-xl bg-[#fbfaf7] p-3">
              <dt class="text-xs font-bold uppercase tracking-[0.12em] text-[#98a2b3]">Message</dt>
              <dd class="mt-1 whitespace-pre-wrap leading-6 text-[#667085]">{{ selectedContact.message }}</dd>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl bg-[#fbfaf7] p-3">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-[#98a2b3]">Reçu</dt>
                <dd class="mt-1 text-[#667085]">{{ formatDate(selectedContact.created_at) }}</dd>
              </div>
              <div class="rounded-xl bg-[#fbfaf7] p-3">
                <dt class="text-xs font-bold uppercase tracking-[0.12em] text-[#98a2b3]">Source</dt>
                <dd class="mt-1 text-[#667085]">{{ selectedContact.source }}</dd>
              </div>
            </div>
          </dl>

          <label class="mt-5 grid gap-2 text-sm font-bold text-[#344054]">
            Note interne
            <textarea
              v-model="noteDraft"
              maxlength="2000"
              rows="6"
              placeholder="Contexte de suivi, prochaine action, réponse déjà envoyée…"
              class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
            />
          </label>

          <div class="mt-4 flex flex-wrap gap-2">
            <BaseButton type="button" :disabled="isSaving" @click="saveNote">
              {{ isSaving ? 'Enregistrement…' : 'Sauver la note' }}
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
          </div>
        </div>

        <p v-else class="rounded-2xl bg-[#fbfaf7] p-4 text-sm text-[#667085]">
          Aucun contact sélectionné.
        </p>
      </aside>
    </div>

    <section class="mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Liste d’attente</h2>
          <p class="mt-1 text-xs text-[#667085]">Emails consentis avec source, foyer et intérêts déclarés.</p>
        </div>
        <BaseBadge tone="neutral">{{ waitlistCount }}</BaseBadge>
      </div>

      <div v-if="isLoading" class="p-5 text-sm text-[#667085]">Chargement de la liste d’attente…</div>
      <div v-else-if="waitlist.length <= 0" class="p-5 text-sm text-[#667085]">Aucune inscription trouvée.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#eee8df] text-sm">
          <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
            <tr>
              <th class="px-5 py-3">Email</th>
              <th class="px-5 py-3">Source</th>
              <th class="px-5 py-3">Foyer</th>
              <th class="px-5 py-3">Intérêts</th>
              <th class="px-5 py-3">Inscription</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df]">
            <tr v-for="lead in waitlist" :key="lead.id" class="transition hover:bg-[#fbfaf7]">
              <td class="px-5 py-4 font-semibold text-[#101828]">{{ lead.email }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ lead.source ?? '—' }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ lead.household_size ?? '—' }}</td>
              <td class="px-5 py-4">
                <div class="flex max-w-md flex-wrap gap-1.5">
                  <BaseBadge v-for="interest in lead.interests" :key="interest" tone="neutral">
                    {{ interest }}
                  </BaseBadge>
                  <span v-if="lead.interests.length <= 0" class="text-[#98a2b3]">—</span>
                </div>
              </td>
              <td class="px-5 py-4 text-[#667085]">{{ formatDate(lead.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
