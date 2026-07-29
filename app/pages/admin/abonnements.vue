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

const readOnlyRules = [
  'Cette page ne modifie aucun abonnement.',
  'Les changements restent gérés par RevenueCat ou par une procédure support.',
  'Les payloads bruts et données sensibles ne sont pas exposés.',
]

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
const hasSearchInput = computed(() => Boolean(search.userId.trim() || search.email.trim()))

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

const subscriptionSummary = computed(() => [
  {
    label: 'Utilisateur',
    value: user.value?.emailMasked ?? '—',
    detail: 'email masqué',
    tone: 'neutral' as BadgeTone,
  },
  {
    label: 'Palier',
    value: user.value ? tierLabels[user.value.subscriptionTier] : '—',
    detail: 'abonnement courant',
    tone: tierTone.value,
  },
  {
    label: 'Compte',
    value: user.value ? accountLabels[user.value.accountStatus] : '—',
    detail: 'statut support',
    tone: accountTone.value,
  },
  {
    label: 'Événements',
    value: String(revenueCatEvents.value.length),
    detail: 'RevenueCat chargés',
    tone: revenueCatEvents.value.length > 0 ? 'primary' as BadgeTone : 'neutral' as BadgeTone,
  },
])

function getEventValue(event: RevenueCatEvent, camelKey: keyof RevenueCatEvent, snakeKey: keyof RevenueCatEvent) {
  return event[camelKey] ?? event[snakeKey] ?? '—'
}

function formatDate(value: unknown) {
  if (!value || typeof value !== 'string') return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function clearMessages() {
  feedback.value = ''
  errorMessage.value = ''
}

async function lookupSubscription() {
  if (!hasSearchInput.value) {
    errorMessage.value = 'Recherche par identifiant ou email requise.'
    return
  }

  isLoading.value = true
  clearMessages()

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
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">COUR-105 · RevenueCat</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-coursia-text">
          Abonnements
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Diagnostic lecture seule du palier courant, des entitlements et des derniers événements RevenueCat.
        </p>
      </div>
      <BaseBadge tone="neutral">Lecture seule</BaseBadge>
    </div>

    <form class="admin-toolbar" @submit.prevent="lookupSubscription">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        UUID utilisateur
        <input v-model="search.userId" placeholder="UUID Supabase" autocomplete="off">
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Email exact
        <input v-model="search.email" type="email" placeholder="info@antoinequarroz.ch" autocomplete="email">
      </label>
      <BaseButton class="self-end" type="submit" :disabled="isLoading || !hasSearchInput">
        {{ isLoading ? 'Recherche...' : 'Rechercher' }}
      </BaseButton>
    </form>

    <div v-if="feedback || errorMessage" class="grid gap-2">
      <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
        {{ feedback }}
      </p>
      <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
        {{ errorMessage }}
      </p>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article v-for="item in subscriptionSummary" :key="item.label" class="admin-stat-card">
        <span>{{ item.label }}</span>
        <strong class="truncate text-base">
          <BaseBadge v-if="item.label === 'Palier' || item.label === 'Compte'" :tone="item.tone">
            {{ item.value }}
          </BaseBadge>
          <template v-else>{{ item.value }}</template>
        </strong>
        <small>{{ item.detail }}</small>
      </article>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-primary">Résumé abonnement</p>
            <h2 class="mt-1 text-lg font-semibold text-coursia-text">État courant</h2>
          </div>
          <BaseBadge :tone="tierTone">{{ user ? tierLabels[user.subscriptionTier] : 'Aucun compte' }}</BaseBadge>
        </div>

        <div v-if="user" class="mt-5 grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">ID utilisateur</p>
            <p class="mt-2 break-all text-sm font-semibold text-coursia-text">{{ user.id }}</p>
          </div>
          <div class="rounded-2xl bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Version app</p>
            <p class="mt-2 text-sm font-semibold text-coursia-text">{{ user.appVersion || '—' }}</p>
          </div>
          <div class="rounded-2xl bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Dernier événement</p>
            <p class="mt-2 text-sm font-semibold text-coursia-text">{{ latestEvent?.type ?? '—' }}</p>
          </div>
        </div>

        <div v-else class="mt-5 rounded-2xl bg-coursia-surface-muted p-5 text-sm text-coursia-muted">
          Recherche un utilisateur pour afficher son état d’abonnement.
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Entitlements</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseBadge v-for="entitlement in activeEntitlements" :key="entitlement" tone="primary">
                {{ entitlement }}
              </BaseBadge>
              <span v-if="activeEntitlements.length === 0" class="text-sm text-coursia-muted">Aucun entitlement chargé.</span>
            </div>
          </div>

          <div class="rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Produits</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <BaseBadge v-for="product in productIds" :key="product" tone="neutral">
                {{ product }}
              </BaseBadge>
              <span v-if="productIds.length === 0" class="text-sm text-coursia-muted">Aucun produit chargé.</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="grid content-start gap-4">
        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-primary">Lecture support</p>
          <h2 class="mt-1 text-lg font-semibold text-coursia-text">Répartition événements</h2>
          <p class="mt-2 text-sm text-coursia-muted">
            Vue synthétique limitée aux événements utiles pour diagnostiquer un problème d’accès.
          </p>

          <div class="mt-5 grid gap-3">
            <div v-for="[type, count] in eventStats" :key="type" class="flex items-center justify-between gap-3 rounded-2xl bg-coursia-surface-muted px-4 py-3">
              <span class="truncate text-sm font-semibold text-coursia-text">{{ type }}</span>
              <BaseBadge tone="neutral">{{ count }}</BaseBadge>
            </div>
            <div v-if="eventStats.length === 0" class="rounded-2xl bg-coursia-surface-muted p-4 text-sm text-coursia-muted">
              Aucune donnée RevenueCat chargée.
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-primary">Règles</p>
          <h2 class="mt-1 text-lg font-semibold text-coursia-text">Ce que cette vue ne fait pas</h2>
          <ul class="mt-4 grid gap-2 text-sm text-coursia-muted">
            <li v-for="rule in readOnlyRules" :key="rule" class="flex gap-2">
              <span class="mt-1 h-1.5 w-1.5 rounded-full bg-coursia-primary" />
              <span>{{ rule }}</span>
            </li>
          </ul>
        </article>
      </aside>
    </div>

    <section class="admin-table overflow-hidden">
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
        <table>
          <thead>
            <tr>
              <th class="text-left">Type</th>
              <th class="text-left">Entitlement</th>
              <th class="text-left">Produit</th>
              <th class="text-left">Achat</th>
              <th class="text-left">Réception</th>
              <th class="text-left">Expiration</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in revenueCatEvents" :key="event.id">
              <td>
                <p class="font-semibold text-coursia-text">{{ event.type }}</p>
                <p class="mt-1 max-w-[12rem] truncate text-xs text-coursia-muted">{{ event.id }}</p>
              </td>
              <td class="text-sm text-coursia-muted">{{ event.entitlement || '—' }}</td>
              <td class="text-sm text-coursia-muted">{{ getEventValue(event, 'productId', 'product_id') }}</td>
              <td class="text-sm text-coursia-muted">{{ formatDate(getEventValue(event, 'purchasedAt', 'purchased_at')) }}</td>
              <td class="text-sm text-coursia-muted">{{ formatDate(getEventValue(event, 'receivedAt', 'received_at')) }}</td>
              <td class="text-sm text-coursia-muted">{{ formatDate(getEventValue(event, 'expiresAt', 'expires_at')) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
