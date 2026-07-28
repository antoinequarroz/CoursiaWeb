<script setup lang="ts">
import {
  impersonationDisabledMessage,
  supportProcedureDescriptions,
  type SupportControlledProcedure,
} from '#shared/validation/support-users'

definePageMeta({
  layout: 'admin',
})

type SupportUser = Record<string, unknown>
type RevenueCatEvent = Record<string, unknown>
type ProcedureAction = SupportControlledProcedure['action']
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

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

const user = ref<SupportUser | null>(null)
const revenueCatEvents = ref<RevenueCatEvent[]>([])
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

const accountTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.accountStatus === 'active') return 'success'
  if (user.value.accountStatus === 'blocked') return 'danger'
  if (user.value.accountStatus === 'pending') return 'warning'
  return 'neutral'
})

const tierTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.subscriptionTier === 'family' || user.value.subscriptionTier === 'premium') return 'success'
  if (user.value.subscriptionTier === 'standard') return 'primary'
  return 'neutral'
})

const procedureLabels: Record<ProcedureAction, string> = {
  export: 'Export',
  delete: 'Suppression',
  block: 'Blocage',
}

const getEventValue = (event: RevenueCatEvent, camelKey: string, snakeKey: string) =>
  event[camelKey] ?? event[snakeKey] ?? '—'

const lookupUser = async () => {
  isLoading.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{
      data: SupportUser
      revenueCatEvents: RevenueCatEvent[]
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
      ? 'Consultation auditée. Données sensibles masquées.'
      : 'Consultation chargée.'
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
    const response = await $fetch<{ data: SupportUser }>('/api/admin/support-users/procedure', {
      method: 'POST',
      body: procedure,
    })

    feedback.value = `Procédure contrôlée créée : ${response.data.action ?? procedure.action}.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de créer la procédure support.'
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
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-105</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Support utilisateurs
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Recherche contrôlée, données sensibles masquées, consultation auditée et procédures
          encadrées pour export, suppression ou blocage.
        </p>
      </div>

      <BaseBadge tone="neutral">{{ impersonationDisabledMessage }}</BaseBadge>
    </div>

    <form class="admin-toolbar mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="lookupUser">
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
        Identifiant utilisateur
        <input
          v-model="search.userId"
          placeholder="UUID"
          class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        >
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
        Email
        <input
          v-model="search.email"
          type="email"
          placeholder="email exact"
          class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
        >
      </label>
      <BaseButton class="self-end" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Recherche...' : 'Rechercher' }}
      </BaseButton>
    </form>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Compte</p>
        <div class="mt-3"><BaseBadge :tone="accountTone">{{ user?.accountStatus ?? '—' }}</BaseBadge></div>
        <p class="mt-3 text-xs text-[#667085]">statut masqué</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Abonnement</p>
        <div class="mt-3"><BaseBadge :tone="tierTone">{{ user?.subscriptionTier ?? '—' }}</BaseBadge></div>
        <p class="mt-3 text-xs text-[#667085]">palier actuel</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Version app</p>
        <p class="mt-3 text-2xl font-semibold text-[#101828]">{{ user?.appVersion ?? '—' }}</p>
        <p class="mt-1 text-xs text-[#667085]">client mobile</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">RevenueCat</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ revenueCatEvents.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">événements utiles</p>
      </article>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Profil</p>
            <h2 class="mt-2 text-lg font-semibold text-[#101828]">Données support masquées</h2>
          </div>
          <BaseBadge tone="neutral">Lecture contrôlée</BaseBadge>
        </div>

        <div v-if="user" class="mt-5 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl bg-[#fbfaf7] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">ID</p>
            <p class="mt-2 break-all text-sm font-medium text-[#101828]">{{ user.id }}</p>
          </div>
          <div class="rounded-2xl bg-[#fbfaf7] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Email</p>
            <p class="mt-2 text-sm font-medium text-[#101828]">{{ user.emailMasked }}</p>
          </div>
          <div class="rounded-2xl bg-[#fbfaf7] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Statut</p>
            <p class="mt-2 text-sm font-medium text-[#101828]">{{ user.accountStatus }}</p>
          </div>
          <div class="rounded-2xl bg-[#fbfaf7] p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Abonnement</p>
            <p class="mt-2 text-sm font-medium text-[#101828]">{{ user.subscriptionTier }}</p>
          </div>
        </div>
        <p v-else class="mt-5 rounded-2xl bg-[#fbfaf7] p-4 text-sm text-[#667085]">
          Aucune donnée foyer ou information sensible non nécessaire n’est affichée par défaut.
        </p>
      </section>

      <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]" @submit.prevent="requestProcedure">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Procédure</p>
        <h2 class="mt-2 text-lg font-semibold text-[#101828]">Action contrôlée</h2>
        <p class="mt-2 text-sm text-[#667085]">
          Aucune action sensible ne part sans ticket, raison et confirmation.
        </p>

        <label class="mt-5 grid gap-1.5 text-xs font-semibold text-[#344054]">
          Action
          <select
            v-model="procedure.action"
            class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
          >
            <option v-for="(label, action) in procedureLabels" :key="action" :value="action">
              {{ label }}
            </option>
          </select>
        </label>
        <p class="mt-2 text-xs text-[#667085]">{{ supportProcedureDescriptions[procedure.action] }}</p>

        <label class="mt-4 grid gap-1.5 text-xs font-semibold text-[#344054]">
          Référence ticket
          <input
            v-model="procedure.ticketReference"
            required
            class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
          >
        </label>
        <label class="mt-4 grid gap-1.5 text-xs font-semibold text-[#344054]">
          Raison
          <textarea
            v-model="procedure.reason"
            required
            rows="4"
            class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
          />
        </label>
        <label class="mt-4 flex items-center gap-3 rounded-xl border border-[#e6e1d8] px-3 py-2.5 text-sm text-[#344054]">
          <input v-model="procedure.confirmed" type="checkbox">
          Confirmation procédure contrôlée
        </label>
        <BaseButton class="mt-5 w-full" type="submit" :disabled="isSaving || !user">
          {{ isSaving ? 'Création...' : 'Créer la procédure' }}
        </BaseButton>
      </form>
    </div>

    <section class="admin-table mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Événements RevenueCat</h2>
          <p class="mt-1 text-xs text-[#667085]">Lecture seule, uniquement les champs utiles au support.</p>
        </div>
        <BaseBadge tone="neutral">{{ revenueCatEvents.length }}</BaseBadge>
      </div>
      <div v-if="revenueCatEvents.length === 0" class="p-5 text-sm text-[#667085]">
        Aucun événement RevenueCat chargé.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#eee8df] text-sm">
          <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
            <tr>
              <th class="px-5 py-3">Type</th>
              <th class="px-5 py-3">Entitlement</th>
              <th class="px-5 py-3">Produit</th>
              <th class="px-5 py-3">Reçu le</th>
              <th class="px-5 py-3">Expire le</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df]">
            <tr v-for="event in revenueCatEvents" :key="String(event.id)" class="transition hover:bg-[#fbfaf7]">
              <td class="px-5 py-4 font-medium text-[#101828]">{{ event.type }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ event.entitlement || '—' }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ getEventValue(event, 'productId', 'product_id') }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ getEventValue(event, 'receivedAt', 'received_at') }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ getEventValue(event, 'expiresAt', 'expires_at') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
