<script setup lang="ts">
import {
  impersonationDisabledMessage,
  supportProcedureDescriptions,
  type SupportControlledProcedure,
} from '#shared/validation/support-users'

definePageMeta({
  layout: 'admin',
})

type AccountStatus = 'active' | 'blocked' | 'deleted' | 'pending'
type SubscriptionTier = 'free' | 'standard' | 'premium' | 'family'
type ProcedureAction = SupportControlledProcedure['action']
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
const showProcedure = ref(false)

const accountLabels: Record<AccountStatus, string> = {
  active: 'Actif',
  blocked: 'Bloqué',
  deleted: 'Supprimé',
  pending: 'En attente',
}

const tierLabels: Record<SubscriptionTier, string> = {
  free: 'Gratuit',
  standard: 'Standard',
  premium: 'Premium',
  family: 'Famille',
}

const procedureLabels: Record<ProcedureAction, string> = {
  export: 'Exporter',
  delete: 'Supprimer',
  block: 'Bloquer',
}

const procedureActionLabels: Record<ProcedureAction, string> = {
  export: 'Demande d’export',
  delete: 'Demande de suppression',
  block: 'Demande de blocage',
}

const supportRules = [
  'Recherche limitée à un email exact ou un UUID Supabase.',
  'Email masqué, aucune donnée foyer ou recette privée affichée.',
  'Événements RevenueCat utiles en lecture seule.',
  'Export, blocage et suppression passent par une procédure auditée.',
]

const accountTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.accountStatus === 'active') return 'success'
  if (user.value.accountStatus === 'blocked' || user.value.accountStatus === 'deleted') return 'danger'
  if (user.value.accountStatus === 'pending') return 'warning'
  return 'neutral'
})

const tierTone = computed<BadgeTone>(() => {
  if (!user.value) return 'neutral'
  if (user.value.subscriptionTier === 'family' || user.value.subscriptionTier === 'premium') return 'success'
  if (user.value.subscriptionTier === 'standard') return 'primary'
  return 'neutral'
})

const latestEvent = computed(() => revenueCatEvents.value[0] ?? null)
const hasSearchInput = computed(() => Boolean(search.userId.trim() || search.email.trim()))
const procedureReady = computed(() =>
  Boolean(user.value && procedure.reason.trim().length >= 10 && procedure.ticketReference.trim().length >= 3 && procedure.confirmed),
)

const supportSummary = computed(() => [
  {
    label: 'Compte',
    value: user.value ? accountLabels[user.value.accountStatus] : '—',
    detail: 'statut support',
    tone: accountTone.value,
  },
  {
    label: 'Abonnement',
    value: user.value ? tierLabels[user.value.subscriptionTier] : '—',
    detail: 'palier courant',
    tone: tierTone.value,
  },
  {
    label: 'Version app',
    value: user.value?.appVersion ?? '—',
    detail: 'client déclaré',
    tone: 'neutral' as BadgeTone,
  },
  {
    label: 'RevenueCat',
    value: String(revenueCatEvents.value.length),
    detail: 'événements chargés',
    tone: revenueCatEvents.value.length > 0 ? 'primary' as BadgeTone : 'neutral' as BadgeTone,
  },
])

const activeEntitlements = computed(() => {
  const entitlements = revenueCatEvents.value
    .map((event) => event.entitlement)
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(entitlements))
})

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

function resetProcedureForUser(profile: SupportUser) {
  procedure.userId = profile.id
  procedure.reason = ''
  procedure.ticketReference = ''
  procedure.confirmed = false
}

function clearMessages() {
  feedback.value = ''
  errorMessage.value = ''
}

async function lookupUser() {
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
      sensitiveDataMasked: boolean
      impersonationEnabled: boolean
    }>('/api/admin/support-users/lookup', {
      query: {
        userId: search.userId.trim() || undefined,
        email: search.email.trim() || undefined,
      },
    })

    user.value = response.data
    revenueCatEvents.value = response.revenueCatEvents
    resetProcedureForUser(response.data)
    showProcedure.value = false
    feedback.value = response.sensitiveDataMasked
      ? 'Consultation auditée. Les données sensibles restent masquées.'
      : 'Profil support chargé.'
  } catch (error) {
    user.value = null
    revenueCatEvents.value = []
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger le profil support.'
  } finally {
    isLoading.value = false
  }
}

async function requestProcedure() {
  if (!user.value) return

  isSaving.value = true
  clearMessages()

  try {
    const response = await $fetch<{ data: { id?: string, action?: ProcedureAction } }>('/api/admin/support-users/procedure', {
      method: 'POST',
      body: procedure,
    })

    feedback.value = `Procédure créée : ${procedureActionLabels[response.data.action ?? procedure.action]}.`
    procedure.reason = ''
    procedure.ticketReference = ''
    procedure.confirmed = false
    showProcedure.value = false
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de créer la procédure support.'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  if (typeof route.query.selected === 'string') {
    search.userId = route.query.selected
  } else {
    search.email = 'info@antoinequarroz.ch'
  }

  void lookupUser()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">COUR-105 · support</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-coursia-text">
          Support utilisateurs
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Vue contrôlée pour retrouver un compte, comprendre son état et lancer une procédure sensible sans exposer le foyer.
        </p>
      </div>

      <BaseBadge tone="neutral">{{ impersonationDisabledMessage }}</BaseBadge>
    </div>

    <form class="admin-toolbar" @submit.prevent="lookupUser">
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
      <article v-for="item in supportSummary" :key="item.label" class="admin-stat-card">
        <span>{{ item.label }}</span>
        <strong class="text-base">
          <BaseBadge v-if="item.label === 'Compte' || item.label === 'Abonnement'" :tone="item.tone">
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
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-primary">Profil minimisé</p>
            <h2 class="mt-1 text-lg font-semibold text-coursia-text">Données support disponibles</h2>
          </div>
          <BaseBadge tone="neutral">Lecture auditée</BaseBadge>
        </div>

        <div v-if="user" class="mt-5 grid gap-3 md:grid-cols-2">
          <div class="rounded-2xl bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">ID utilisateur</p>
            <p class="mt-2 break-all text-sm font-semibold text-coursia-text">{{ user.id }}</p>
          </div>
          <div class="rounded-2xl bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Email</p>
            <p class="mt-2 text-sm font-semibold text-coursia-text">{{ user.emailMasked }}</p>
          </div>
          <div class="rounded-2xl bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Dernier événement</p>
            <p class="mt-2 text-sm font-semibold text-coursia-text">{{ latestEvent ? latestEvent.type : '—' }}</p>
          </div>
          <div class="rounded-2xl bg-coursia-surface-muted p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.12em] text-coursia-muted">Reçu le</p>
            <p class="mt-2 text-sm font-semibold text-coursia-text">
              {{ latestEvent ? formatDate(getEventValue(latestEvent, 'receivedAt', 'received_at')) : '—' }}
            </p>
          </div>
        </div>

        <div v-else class="mt-5 rounded-2xl bg-coursia-surface-muted p-5 text-sm text-coursia-muted">
          Recherche un utilisateur par email exact ou identifiant. Les données sensibles restent hors de cette interface.
        </div>

        <div class="mt-5 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-4">
          <h3 class="text-sm font-semibold text-coursia-text">Garde-fous support</h3>
          <ul class="mt-3 grid gap-2 text-sm text-coursia-muted">
            <li v-for="rule in supportRules" :key="rule" class="flex gap-2">
              <span class="mt-1 h-1.5 w-1.5 rounded-full bg-coursia-primary" />
              <span>{{ rule }}</span>
            </li>
          </ul>
        </div>
      </section>

      <aside class="grid content-start gap-4">
        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-primary">Abonnement</p>
          <h2 class="mt-1 text-lg font-semibold text-coursia-text">Entitlements actifs</h2>
          <p class="mt-2 text-sm text-coursia-muted">
            {{ activeEntitlements.length ? activeEntitlements.join(', ') : 'Aucun entitlement actif chargé.' }}
          </p>
          <BaseButton class="mt-4 w-full" type="button" variant="secondary" :disabled="!user" @click="showProcedure = !showProcedure">
            {{ showProcedure ? 'Fermer la procédure' : 'Créer une procédure' }}
          </BaseButton>
        </article>

        <form v-if="showProcedure" class="rounded-2xl border border-coursia-border bg-coursia-surface p-5" @submit.prevent="requestProcedure">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-primary">Procédure contrôlée</p>
          <h2 class="mt-1 text-lg font-semibold text-coursia-text">Export, suppression, blocage</h2>
          <p class="mt-2 text-sm text-coursia-muted">
            Ces actions créent une demande traçable. Rien n’est exécuté silencieusement depuis cette vue.
          </p>

          <label class="mt-5 grid gap-1.5 text-xs font-semibold text-coursia-text">
            Action
            <select v-model="procedure.action">
              <option v-for="(label, action) in procedureLabels" :key="action" :value="action">
                {{ label }}
              </option>
            </select>
          </label>
          <p class="mt-2 rounded-xl bg-coursia-surface-muted px-3 py-2 text-xs text-coursia-muted">
            {{ supportProcedureDescriptions[procedure.action] }}
          </p>

          <label class="mt-4 grid gap-1.5 text-xs font-semibold text-coursia-text">
            Référence ticket
            <input v-model="procedure.ticketReference" required placeholder="COUR-105 / support-123">
          </label>

          <label class="mt-4 grid gap-1.5 text-xs font-semibold text-coursia-text">
            Raison
            <textarea v-model="procedure.reason" required rows="4" placeholder="Explique pourquoi cette procédure est nécessaire." />
          </label>

          <label class="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-coursia-border bg-coursia-surface-muted px-3 py-2.5 text-sm text-coursia-muted">
            <input v-model="procedure.confirmed" class="mt-1 cursor-pointer" type="checkbox">
            <span>Je confirme que la demande est légitime, documentée et liée au ticket indiqué.</span>
          </label>

          <BaseButton class="mt-5 w-full" type="submit" :disabled="isSaving || !procedureReady">
            {{ isSaving ? 'Création...' : 'Créer la procédure' }}
          </BaseButton>
        </form>
      </aside>
    </div>

    <section class="admin-table overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-coursia-text">Événements RevenueCat</h2>
          <p class="mt-1 text-xs text-coursia-muted">
            Lecture seule. Les payloads bruts et données sensibles restent hors interface support.
          </p>
        </div>
        <BaseBadge tone="neutral">{{ revenueCatEvents.length }}</BaseBadge>
      </div>

      <div v-if="revenueCatEvents.length === 0" class="p-5 text-sm text-coursia-muted">
        Aucun événement RevenueCat chargé.
      </div>

      <div v-else class="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th class="text-left">Type</th>
              <th class="text-left">Entitlement</th>
              <th class="text-left">Produit</th>
              <th class="text-left">Achat</th>
              <th class="text-left">Reçu</th>
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
