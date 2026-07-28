<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type SupportUser = Record<string, unknown>
type RevenueCatEvent = Record<string, unknown>
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const search = reactive({
  userId: '',
  email: '',
})

const user = ref<SupportUser | null>(null)
const revenueCatEvents = ref<RevenueCatEvent[]>([])
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const tierTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.subscriptionTier === 'family' || user.value.subscriptionTier === 'premium') return 'success'
  if (user.value.subscriptionTier === 'standard') return 'primary'
  return 'neutral'
})

const accountTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.accountStatus === 'active') return 'success'
  if (user.value.accountStatus === 'blocked') return 'danger'
  if (user.value.accountStatus === 'pending') return 'warning'
  return 'neutral'
})

const getEventValue = (event: RevenueCatEvent, camelKey: string, snakeKey: string) =>
  event[camelKey] ?? event[snakeKey] ?? '—'

const lookupSubscription = async () => {
  isLoading.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<{
      data: SupportUser
      revenueCatEvents: RevenueCatEvent[]
    }>('/api/admin/support-users/lookup', {
      query: {
        userId: search.userId || undefined,
        email: search.email || undefined,
      },
    })

    user.value = response.data
    revenueCatEvents.value = response.revenueCatEvents
    feedback.value = 'Consultation abonnement auditée, RevenueCat en lecture seule.'
  } catch (error) {
    user.value = null
    revenueCatEvents.value = []
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger l’abonnement.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-105</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Support abonnements
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Vue lecture seule du palier d’abonnement et des événements RevenueCat nécessaires au
          diagnostic support.
        </p>
      </div>
      <BaseBadge tone="neutral">Lecture seule</BaseBadge>
    </div>

    <form class="admin-toolbar mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="lookupSubscription">
      <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
        Identifiant utilisateur
        <input
          v-model="search.userId"
          placeholder="UUID utilisateur"
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
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Utilisateur</p>
        <p class="mt-3 truncate text-2xl font-semibold text-[#101828]">{{ user?.emailMasked ?? '—' }}</p>
        <p class="mt-1 text-xs text-[#667085]">email masqué</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Palier</p>
        <div class="mt-3"><BaseBadge :tone="tierTone">{{ user?.subscriptionTier ?? '—' }}</BaseBadge></div>
        <p class="mt-3 text-xs text-[#667085]">plan actif</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Compte</p>
        <div class="mt-3"><BaseBadge :tone="accountTone">{{ user?.accountStatus ?? '—' }}</BaseBadge></div>
        <p class="mt-3 text-xs text-[#667085]">statut utilisateur</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Événements</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ revenueCatEvents.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">RevenueCat</p>
      </article>
    </div>

    <section v-if="user" class="mt-6 rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Abonnement</p>
          <h2 class="mt-2 text-lg font-semibold text-[#101828]">Résumé du compte</h2>
        </div>
        <BaseBadge :tone="tierTone">{{ user.subscriptionTier }}</BaseBadge>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl bg-[#fbfaf7] p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">ID utilisateur</p>
          <p class="mt-2 break-all text-sm font-medium text-[#101828]">{{ user.id }}</p>
        </div>
        <div class="rounded-2xl bg-[#fbfaf7] p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Version app</p>
          <p class="mt-2 text-sm font-medium text-[#101828]">{{ user.appVersion || '—' }}</p>
        </div>
        <div class="rounded-2xl bg-[#fbfaf7] p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">Statut compte</p>
          <p class="mt-2 text-sm font-medium text-[#101828]">{{ user.accountStatus }}</p>
        </div>
      </div>
    </section>

    <section class="admin-table mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Timeline RevenueCat</h2>
          <p class="mt-1 text-xs text-[#667085]">Diagnostic uniquement, aucune mutation depuis cette page.</p>
        </div>
        <BaseBadge tone="neutral">{{ revenueCatEvents.length }}</BaseBadge>
      </div>
      <div v-if="revenueCatEvents.length === 0" class="p-5 text-sm text-[#667085]">
        Recherche un utilisateur pour afficher ses événements d’abonnement.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#eee8df] text-sm">
          <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
            <tr>
              <th class="px-5 py-3">Type</th>
              <th class="px-5 py-3">Entitlement</th>
              <th class="px-5 py-3">Produit</th>
              <th class="px-5 py-3">Achat</th>
              <th class="px-5 py-3">Expiration</th>
              <th class="px-5 py-3">Réception</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df]">
            <tr v-for="event in revenueCatEvents" :key="String(event.id)" class="transition hover:bg-[#fbfaf7]">
              <td class="px-5 py-4 font-medium text-[#101828]">{{ event.type }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ event.entitlement || '—' }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ getEventValue(event, 'productId', 'product_id') }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ getEventValue(event, 'purchasedAt', 'purchased_at') }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ getEventValue(event, 'expiresAt', 'expires_at') }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ getEventValue(event, 'receivedAt', 'received_at') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
