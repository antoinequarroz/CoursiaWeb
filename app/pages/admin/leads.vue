<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type ContactLead = {
  id: string
  name: string
  email: string
  reason: string
  message: string
  source: string
  status: string
  created_at: string
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
  limit: 50,
})

const contacts = ref<ContactLead[]>([])
const waitlist = ref<WaitlistLead[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const contactCount = computed(() => contacts.value.length)
const waitlistCount = computed(() => waitlist.value.length)
const totalLeads = computed(() => contactCount.value + waitlistCount.value)
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
        limit: filters.limit,
      },
    })

    contacts.value = response.data.contacts
    waitlist.value = response.data.waitlist
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les leads.'
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [filters.search, filters.limit],
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
          Les demandes publiques sont conservées côté serveur, consultables par le support et séparées
          du modèle mobile. Aucune clé privilégiée n’est exposée au client.
        </p>
      </div>

      <BaseButton type="button" :disabled="isLoading" @click="loadLeads">
        {{ isLoading ? 'Chargement…' : 'Rafraîchir' }}
      </BaseButton>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-3">
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Total</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ totalLeads }}</p>
        <p class="mt-1 text-xs text-[#667085]">leads chargés</p>
      </article>
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Contacts</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ contactCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">messages reçus</p>
      </article>
      <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.04)]">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Dernier lead</p>
        <p class="mt-3 text-lg font-semibold text-[#101828]">{{ latestLeadDate }}</p>
        <p class="mt-1 text-xs text-[#667085]">contact ou inscription</p>
      </article>
    </div>

    <div class="mt-6 grid gap-3 md:grid-cols-[1fr_12rem]">
      <input
        v-model="filters.search"
        type="search"
        placeholder="Rechercher par email, nom, source ou sujet"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      />
      <select
        v-model.number="filters.limit"
        class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
      >
        <option :value="25">25 lignes</option>
        <option :value="50">50 lignes</option>
        <option :value="100">100 lignes</option>
      </select>
    </div>

    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <section class="mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Messages de contact</h2>
          <p class="mt-1 text-xs text-[#667085]">Demandes produit, partenariat, support, presse ou données.</p>
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
              <th class="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df]">
            <tr v-for="lead in contacts" :key="lead.id" class="transition hover:bg-[#fbfaf7]">
              <td class="px-5 py-4">
                <span class="block font-semibold text-[#101828]">{{ lead.name }}</span>
                <span class="mt-1 block text-xs text-[#667085]">{{ lead.email }}</span>
              </td>
              <td class="px-5 py-4 text-[#344054]">{{ lead.reason }}</td>
              <td class="max-w-xl px-5 py-4">
                <span class="line-clamp-2 text-[#667085]">{{ lead.message }}</span>
              </td>
              <td class="px-5 py-4">
                <BaseBadge :tone="lead.status === 'new' ? 'warning' : 'neutral'">
                  {{ lead.status }}
                </BaseBadge>
              </td>
              <td class="px-5 py-4 text-[#667085]">{{ formatDate(lead.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

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
