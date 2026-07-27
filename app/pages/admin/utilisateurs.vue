<script setup lang="ts">
import {
  impersonationDisabledMessage,
  supportProcedureDescriptions,
  type SupportControlledProcedure,
} from '#shared/validation/support-users'

definePageMeta({
  layout: 'admin',
})

const search = reactive({
  userId: '',
  email: '',
})

const procedure = reactive<SupportControlledProcedure>({
  action: 'export',
  userId: '00000000-0000-4000-8000-000000000001',
  reason: '',
  ticketReference: '',
  confirmed: false,
})

const user = ref<Record<string, unknown> | null>(null)
const revenueCatEvents = ref<Array<Record<string, unknown>>>([])
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

const lookupUser = async () => {
  isLoading.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{
      data: Record<string, unknown>
      revenueCatEvents: Array<Record<string, unknown>>
      sensitiveDataMasked: boolean
      impersonationEnabled: boolean
    }>('/api/admin/support-users/lookup', {
      query: {
        userId: search.userId || undefined,
        email: search.email || undefined,
      },
    })

    user.value = response.data
    revenueCatEvents.value = response.revenueCatEvents
    procedure.userId = String(response.data.id)
    feedback.value = response.sensitiveDataMasked
      ? 'Consultation auditee. Donnees sensibles masquees.'
      : 'Consultation chargee.'
  } catch (error) {
    user.value = null
    revenueCatEvents.value = []
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger le profil support.'
  } finally {
    isLoading.value = false
  }
}

const requestProcedure = async () => {
  isSaving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: Record<string, unknown> }>('/api/admin/support-users/procedure', {
      method: 'POST',
      body: procedure,
    })

    feedback.value = `Procedure controlee creee : ${response.data.action}.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de creer la procedure support.'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  search.email = 'info@antoinequarroz.ch'
  void lookupUser()
})
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-105</p>
        <h1 class="mt-2 text-3xl font-black">Support utilisateurs</h1>
        <p class="mt-3 max-w-3xl text-coursia-muted">
          Recherche controlee par identifiant ou email, donnees masquees, statut compte,
          version app, palier d abonnement et consultations auditees.
        </p>
      </div>
      <div class="rounded-full bg-coursia-surface-muted px-4 py-2 text-sm font-black">
        {{ impersonationDisabledMessage }}
      </div>
    </div>

    <form class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="lookupUser">
      <label class="grid gap-2 text-sm font-bold">
        Identifiant utilisateur
        <input v-model="search.userId" placeholder="UUID" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      </label>
      <label class="grid gap-2 text-sm font-bold">
        Email
        <input v-model="search.email" type="email" placeholder="email exact" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      </label>
      <BaseButton class="self-end" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Recherche...' : 'Rechercher' }}
      </BaseButton>
    </form>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>
    <p v-if="errorMessage" class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{{ errorMessage }}</p>

    <section class="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-2xl font-black">Profil support masque</h2>
        <div v-if="user" class="mt-5 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl bg-coursia-background p-4">ID : {{ user.id }}</div>
          <div class="rounded-2xl bg-coursia-background p-4">Email : {{ user.emailMasked }}</div>
          <div class="rounded-2xl bg-coursia-background p-4">Statut compte : {{ user.accountStatus }}</div>
          <div class="rounded-2xl bg-coursia-background p-4">Version app : {{ user.appVersion || '-' }}</div>
          <div class="rounded-2xl bg-coursia-background p-4">Palier abonnement : {{ user.subscriptionTier }}</div>
        </div>
        <p v-else class="mt-5 text-sm text-coursia-muted">
          Aucune donnee foyer ou information sensible non necessaire n est affichee par defaut.
        </p>
      </article>

      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="requestProcedure">
        <h2 class="text-2xl font-black">Procedure controlee</h2>
        <p class="mt-3 text-sm text-coursia-muted">
          Export, suppression et blocage exigent ticket, raison longue, confirmation et droits administrateur.
        </p>
        <label class="mt-5 grid gap-2 text-sm font-bold">
          Action
          <select v-model="procedure.action" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
            <option value="export">Export</option>
            <option value="delete">Suppression</option>
            <option value="block">Blocage</option>
          </select>
        </label>
        <p class="mt-2 text-xs text-coursia-muted">{{ supportProcedureDescriptions[procedure.action] }}</p>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Reference ticket
          <input v-model="procedure.ticketReference" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Raison
          <textarea v-model="procedure.reason" required rows="4" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 flex items-center gap-3 text-sm font-bold">
          <input v-model="procedure.confirmed" type="checkbox" />
          Confirmation procedure controlee
        </label>
        <BaseButton class="mt-6" type="submit" :disabled="isSaving || !user">
          {{ isSaving ? 'Creation...' : 'Creer la procedure' }}
        </BaseButton>
      </form>
    </section>

    <section class="mt-8 rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
      <h2 class="text-xl font-black">Evenements RevenueCat utiles - lecture seule</h2>
      <div class="mt-4 grid gap-3">
        <div v-for="event in revenueCatEvents" :key="String(event.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
          {{ event.type }} - {{ event.entitlement || '-' }} - {{ event.product_id || '-' }} - recu {{ event.received_at }}
        </div>
      </div>
    </section>
  </section>
</template>
