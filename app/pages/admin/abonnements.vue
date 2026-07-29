<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type AccountStatus = 'active' | 'blocked' | 'deleted' | 'pending'
type SubscriptionTier = 'free' | 'standard' | 'premium' | 'family'
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type SupportUser = {
  id: string
  emailMasked: string
  accountStatus: AccountStatus
  appVersion: string | null
  subscriptionTier: SubscriptionTier
}

type RevenueCatEvent = {
  id: string
  type: string
  entitlement?: string | null
  productId?: string | null
  product_id?: string | null
  purchasedAt?: string | null
  purchased_at?: string | null
  receivedAt?: string | null
  received_at?: string | null
  expiresAt?: string | null
  expires_at?: string | null
}

const route = useRoute()

const search = reactive({
  userId: '',
  email: '',
})

const user = ref<SupportUser | null>(null)
const revenueCatEvents = ref<RevenueCatEvent[]>([])
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const tierLabels: Record<SubscriptionTier, string> = {
  free: 'Gratuit',
  standard: 'Standard',
  premium: 'Premium',
  family: 'Famille',
}

const accountLabels: Record<AccountStatus, string> = {
  active: 'Actif',
  blocked: 'Bloqué',
  deleted: 'Supprimé',
  pending: 'En attente',
}

const tierTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.subscriptionTier === 'family' || user.value.subscriptionTier === 'premium') return 'success'
  if (user.value.subscriptionTier === 'standard') return 'primary'
  return 'neutral'
})

const accountTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.accountStatus === 'active') return 'success'
  if (user.value.accountStatus === 'blocked' || user.value.accountStatus === 'deleted') return 'danger'
  if (user.value.accountStatus === 'pending') return 'warning'
  return 'neutral'
})

const latestEvent = computed(() => revenueCatEvents.value[0] ?? null)

const activeEntitlements = computed(() => {
  const entitlements = revenueCatEvents.value
    .map((event) => event.entitlement)
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(entitlements))
})

const productIds = computed(() => {
  const products = revenueCatEvents.value
    .map((event) => getEventValue(event, 'productId', 'product_id'))
    .filter((value): value is string => typeof value === 'string' && value !== '—')

  return Array.from(new Set(products))
})

const eventStats = computed(() => {
  const byType = revenueCatEvents.value.reduce<Record<string, number>>((acc, event) => {
    acc[event.type] = (acc[event.type] ?? 0) + 1
    return acc
  }, {})

  return Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
})

const getEventValue = (event: RevenueCatEvent, camelKey: keyof RevenueCatEvent, snakeKey: keyof RevenueCatEvent) =>
  event[camelKey] ?? event[snakeKey] ?? '—'

const formatDate = (value: unknown) => {
  if (!value || typeof value !== 'string') return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

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
        userId: search.userId.trim() || undefined,
        email: search.email.trim() || undefined,
      },
    })

    user.value = response.data
    revenueCatEvents.value = response.revenueCatEvents
    feedback.value = 'Consultation abonnement auditée. RevenueCat reste en lecture seule.'
  } catch (error) {
    user.value = null
    revenueCatEvents.value = []
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger l’abonnement.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (typeof route.query.selected === 'string') {
    search.userId = route.query.selected
  } else {
    search.email = 'info@antoinequarroz.ch'
  }

  void lookupSubscription()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-105</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Abonnements
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Diagnostic support des abonnements : palier courant, état du compte, derniers événements
          RevenueCat et produits associés. Aucune mutation depuis cette vue.
        </p>
      </div>
      <BaseBadge tone="neutral">Lecture seule</BaseBadge>
    </div>

    <form class="admin-toolbar grid gap-3 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="lookupSubscription">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Identifiant utilisateur
        <input
          v-model="search.userId"
          placeholder="UUID Supabase"
          autocomplete="off"
        >
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Email
        <input
          v-model="search.email"
          type="email"
          placeholder="email exact"
          autocomplete="email"
        >
      </label>
      <BaseButton class="self-end" type="submit" :disabled="isLoading">
        {{ isLoading ? 'Recherche...' : 'Rechercher' }}
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

    <div class="grid gap-4 md:grid-cols-4">
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Utilisateur</p>
        <p class="mt-3 truncate text-xl font-semibold text-coursia-text">{{ user?.emailMasked ?? '—' }}</p>
        <p class="mt-1 text-xs text-coursia-muted">Email masqué</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Palier</p>
          <BaseBadge :tone="tierTone">
            {{ user ? tierLabels[user.subscriptionTier] : '—' }}
          </BaseBadge>
        </div>
        <p class="mt-4 text-sm text-coursia-muted">Source support synchronisée depuis Supabase.</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Compte</p>
          <BaseBadge :tone="accountTone">
            {{ user ? accountLabels[user.accountStatus] : '—' }}
          </BaseBadge>
        </div>
        <p class="mt-4 text-sm text-coursia-muted">Statut utile au diagnostic support.</p>
      </article>

      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Événements</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ revenueCatEvents.length }}</p>
        <p class="mt-1 text-xs text-coursia-muted">Derniers événements RevenueCat</p>
      </article>
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Résumé abonnement</p>
            <h2 class="mt-2 text-lg font-semibold text-coursia-text">État courant</h2>
          </div>
          <BaseBadge :tone="tierTone">{{ user ? tierLabels[user.subscriptionTier] : 'Aucun compte' }}</BaseBadge>
        </div>

        <div v-if="user" class="mt-5 grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl bg-coursia-background p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">ID utilisateur</p>
            <p class="mt-2 break-all text-sm font-medium text-coursia-text">{{ user.id }}</p>
          </div>
          <div class="rounded-2xl bg-coursia-background p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Version app</p>
            <p class="mt-2 text-sm font-medium text-coursia-text">{{ user.appVersion || '—' }}</p>
          </div>
          <div class="rounded-2xl bg-coursia-background p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Dernier événement</p>
            <p class="mt-2 text-sm font-medium text-coursia-text">{{ latestEvent?.type ?? '—' }}</p>
          </div>
        </div>

        <div v-else class="mt-5 rounded-2xl bg-coursia-background p-5 text-sm text-coursia-muted">
          Recherche un utilisateur pour afficher son état d’abonnement.
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl border border-coursia-border bg-coursia-background p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Entitlements</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseBadge
                v-for="entitlement in activeEntitlements"
                :key="entitlement"
                tone="primary"
              >
                {{ entitlement }}
              </BaseBadge>
              <span v-if="activeEntitlements.length === 0" class="text-sm text-coursia-muted">Aucun entitlement chargé.</span>
            </div>
          </div>

          <div class="rounded-2xl border border-coursia-border bg-coursia-background p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Produits</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseBadge
                v-for="product in productIds"
                :key="product"
                tone="neutral"
              >
                {{ product }}
              </BaseBadge>
              <span v-if="productIds.length === 0" class="text-sm text-coursia-muted">Aucun produit chargé.</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Lecture support</p>
        <h2 class="mt-2 text-lg font-semibold text-coursia-text">Répartition événements</h2>
        <p class="mt-2 text-sm text-coursia-muted">
          Les données sont limitées aux derniers événements utiles. Les payloads bruts restent masqués.
        </p>

        <div class="mt-5 grid gap-3">
          <div
            v-for="[type, count] in eventStats"
            :key="type"
            class="flex items-center justify-between rounded-2xl bg-coursia-background px-4 py-3"
          >
            <span class="truncate text-sm font-medium text-coursia-text">{{ type }}</span>
            <BaseBadge tone="neutral">{{ count }}</BaseBadge>
          </div>
          <div v-if="eventStats.length === 0" class="rounded-2xl bg-coursia-background p-4 text-sm text-coursia-muted">
            Aucune donnée RevenueCat chargée.
          </div>
        </div>
      </aside>
    </div>

    <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-coursia-text">Timeline RevenueCat</h2>
          <p class="mt-1 text-xs text-coursia-muted">
            Diagnostic uniquement. Les changements d’abonnement se font hors de cette page.
          </p>
        </div>
        <BaseBadge tone="neutral">{{ revenueCatEvents.length }}</BaseBadge>
      </div>

      <div v-if="revenueCatEvents.length === 0" class="p-5 text-sm text-coursia-muted">
        Recherche un utilisateur pour afficher ses événements d’abonnement.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-coursia-border text-sm">
          <thead>
            <tr>
              <th class="px-5 py-3">Type</th>
              <th class="px-5 py-3">Entitlement</th>
              <th class="px-5 py-3">Produit</th>
              <th class="px-5 py-3">Achat</th>
              <th class="px-5 py-3">Réception</th>
              <th class="px-5 py-3">Expiration</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-coursia-border">
            <tr v-for="event in revenueCatEvents" :key="event.id" class="transition hover:bg-coursia-background">
              <td class="px-5 py-4">
                <p class="font-semibold text-coursia-text">{{ event.type }}</p>
                <p class="mt-1 max-w-[12rem] truncate text-xs text-coursia-muted">{{ event.id }}</p>
              </td>
              <td class="px-5 py-4 text-coursia-muted">{{ event.entitlement || '—' }}</td>
              <td class="px-5 py-4 text-coursia-muted">{{ getEventValue(event, 'productId', 'product_id') }}</td>
              <td class="px-5 py-4 text-coursia-muted">{{ formatDate(getEventValue(event, 'purchasedAt', 'purchased_at')) }}</td>
              <td class="px-5 py-4 text-coursia-muted">{{ formatDate(getEventValue(event, 'receivedAt', 'received_at')) }}</td>
              <td class="px-5 py-4 text-coursia-muted">{{ formatDate(getEventValue(event, 'expiresAt', 'expires_at')) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
