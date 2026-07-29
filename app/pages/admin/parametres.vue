<script setup lang="ts">
import type { FeatureFlagInput } from '#shared/validation/content-settings'

definePageMeta({
  layout: 'admin',
})

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type FlagRecord = {
  id?: string
  key?: string
  name?: string
  description?: string | null
  enabled?: boolean
  critical?: boolean
  rollout_percentage?: number | null
  rolloutPercentage?: number | null
  updated_at?: string | null
  created_at?: string | null
}

const guardrails = [
  'Aucun secret ni paramètre technique dans ce module.',
  'Les flags critiques exigent une raison auditable.',
  'Les clés sensibles sont refusées côté validation serveur.',
]

function createEmptyFlag(): FeatureFlagInput {
  return {
    key: '',
    name: '',
    description: '',
    enabled: false,
    critical: false,
    rolloutPercentage: 0,
    reason: '',
  }
}

const flagForm = reactive<FeatureFlagInput>(createEmptyFlag())
const flags = ref<FlagRecord[]>([])
const selectedKey = ref<string | null>(null)
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

const activeCount = computed(() => flags.value.filter((flag) => Boolean(flag.enabled)).length)
const inactiveCount = computed(() => Math.max(flags.value.length - activeCount.value, 0))
const criticalCount = computed(() => flags.value.filter((flag) => Boolean(flag.critical)).length)
const averageRollout = computed(() => {
  if (flags.value.length === 0) return 0

  const total = flags.value.reduce((sum, flag) => sum + getRollout(flag), 0)
  return Math.round(total / flags.value.length)
})

const selectedFlag = computed(() => flags.value.find((flag) => String(flag.key) === selectedKey.value) ?? null)
const formIsCriticalWithoutReason = computed(() => flagForm.critical && (flagForm.reason ?? '').trim().length < 10)
const canSaveFlag = computed(() => Boolean(flagForm.key.trim() && flagForm.name.trim() && !formIsCriticalWithoutReason.value))

function getRollout(flag: FlagRecord): number {
  return Number(flag.rollout_percentage ?? flag.rolloutPercentage ?? 0)
}

function flagTone(flag: FlagRecord): BadgeTone {
  if (flag.critical) return 'danger'
  if (flag.enabled) return 'success'
  return 'neutral'
}

function statusLabel(flag: FlagRecord): string {
  if (flag.critical) return flag.enabled ? 'Critique actif' : 'Critique inactif'
  return flag.enabled ? 'Actif' : 'Inactif'
}

function formatDate(value: unknown): string {
  if (!value || typeof value !== 'string') return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function resetForm(): void {
  Object.assign(flagForm, createEmptyFlag())
  selectedKey.value = null
  feedback.value = ''
  errorMessage.value = ''
}

async function loadFlags(): Promise<void> {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: FlagRecord[] }>('/api/admin/feature-flags')
    flags.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les feature flags.'
  } finally {
    isLoading.value = false
  }
}

async function saveFlag(): Promise<void> {
  isSaving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    await $fetch('/api/admin/feature-flags', {
      method: 'POST',
      body: flagForm,
    })
    feedback.value = flagForm.critical
      ? 'Flag critique enregistré avec raison auditable.'
      : 'Flag enregistré et audité.'
    const savedKey = flagForm.key
    await loadFlags()
    selectedKey.value = savedKey
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’enregistrer le feature flag.'
  } finally {
    isSaving.value = false
  }
}

function selectFlag(flag: FlagRecord): void {
  selectedKey.value = String(flag.key ?? '')
  flagForm.key = String(flag.key ?? '')
  flagForm.name = String(flag.name ?? '')
  flagForm.description = String(flag.description ?? '')
  flagForm.enabled = Boolean(flag.enabled)
  flagForm.critical = Boolean(flag.critical)
  flagForm.rolloutPercentage = getRollout(flag)
  flagForm.reason = flagForm.critical ? `Mise à jour contrôlée du flag ${flagForm.key}` : ''
  feedback.value = ''
  errorMessage.value = ''
}

onMounted(loadFlags)
</script>

<template>
  <section class="admin-page">
    <AdminPageHeader
      eyebrow="COUR-106 · paramètres"
      title="Paramètres non techniques"
      description="Pilotage des feature flags administrables sans redéploiement. Les secrets, clés serveur et réglages techniques restent exclus de cette interface."
    >
      <template #actions>
        <BaseButton type="button" variant="secondary" @click="resetForm">
          Nouveau flag
        </BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadFlags">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card">
        <p class="admin-stat-label">Flags</p>
        <p class="admin-stat-value">{{ flags.length }}</p>
        <p class="admin-stat-caption">chargés depuis Supabase</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Actifs</p>
        <p class="admin-stat-value">{{ activeCount }}</p>
        <p class="admin-stat-caption">{{ inactiveCount }} inactifs</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Critiques</p>
        <p class="admin-stat-value">{{ criticalCount }}</p>
        <p class="admin-stat-caption">raison auditable requise</p>
      </article>
      <article class="admin-stat-card">
        <p class="admin-stat-label">Rollout moyen</p>
        <p class="admin-stat-value">{{ averageRollout }}%</p>
        <p class="admin-stat-caption">sur les flags listés</p>
      </article>
    </div>

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

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <AdminPanel
        title="Feature flags"
        description="Clique sur une ligne pour modifier le flag et documenter son changement."
        :padded="false"
      >
        <template #actions>
          <BaseBadge tone="neutral">Sans secrets</BaseBadge>
        </template>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">
          Chargement des flags...
        </div>
        <AdminEmptyState
          v-else-if="flags.length === 0"
          icon="settings"
          title="Aucun flag trouvé"
          description="Crée un flag administrable pour piloter un comportement non technique."
        />

        <AdminTableShell v-else>
            <thead>
              <tr>
                <th>Flag</th>
                <th>Statut</th>
                <th>Rollout</th>
                <th>Mise à jour</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="flag in flags"
                :key="String(flag.id ?? flag.key)"
                class="admin-row"
                :class="selectedKey === String(flag.key) ? 'admin-row-selected' : ''"
                @click="selectFlag(flag)"
              >
                <td>
                  <span class="block font-semibold text-coursia-text">{{ flag.name }}</span>
                  <span class="mt-1 block font-mono text-xs text-coursia-muted">{{ flag.key }}</span>
                  <span class="mt-2 line-clamp-2 block max-w-xl text-xs leading-5 text-coursia-muted">
                    {{ flag.description || 'Aucune description.' }}
                  </span>
                </td>
                <td>
                  <BaseBadge :tone="flagTone(flag)">{{ statusLabel(flag) }}</BaseBadge>
                </td>
                <td>
                  <div class="flex min-w-[8rem] items-center gap-3">
                    <div class="h-2 flex-1 overflow-hidden rounded-full bg-coursia-border ">
                      <div
                        class="h-full rounded-full bg-coursia-primary"
                        :style="{ width: `${getRollout(flag)}%` }"
                      />
                    </div>
                    <span class="w-10 text-right text-xs font-semibold text-coursia-muted">
                      {{ getRollout(flag) }}%
                    </span>
                  </div>
                </td>
                <td class="text-coursia-muted">
                  {{ formatDate(flag.updated_at ?? flag.created_at) }}
                </td>
              </tr>
            </tbody>
        </AdminTableShell>
      </AdminPanel>

      <aside class="grid gap-4">
        <form
          class="rounded-3xl border border-coursia-border bg-coursia-surface p-5"
          @submit.prevent="saveFlag"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">
                Réglage protégé
              </p>
              <h2 class="mt-2 text-lg font-semibold text-coursia-text">
                {{ selectedFlag ? 'Modifier le flag' : 'Nouveau flag' }}
              </h2>
            </div>
            <BaseBadge :tone="flagForm.critical ? 'danger' : 'neutral'">
              {{ flagForm.critical ? 'Critique' : 'Standard' }}
            </BaseBadge>
          </div>

          <div class="mt-5 grid gap-4">
            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Clé non sensible
              <input
                v-model="flagForm.key"
                required
                placeholder="ex: public.waitlist"
                autocomplete="off"
              >
            </label>

            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Nom
              <input
                v-model="flagForm.name"
                required
                placeholder="Nom lisible pour l’équipe"
              >
            </label>

            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Description
              <textarea
                v-model="flagForm.description"
                rows="4"
                placeholder="But du flag, impact produit, limite éventuelle."
              />
            </label>

            <div class="grid grid-cols-2 gap-2">
              <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-coursia-border bg-coursia-surface-muted px-3 py-2.5 text-sm text-coursia-muted">
                <input v-model="flagForm.enabled" class="cursor-pointer" type="checkbox">
                Actif
              </label>
              <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-coursia-border bg-coursia-surface-muted px-3 py-2.5 text-sm text-coursia-muted">
                <input v-model="flagForm.critical" class="cursor-pointer" type="checkbox">
                Critique
              </label>
            </div>

            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Rollout
              <input
                v-model.number="flagForm.rolloutPercentage"
                type="number"
                min="0"
                max="100"
              >
            </label>

            <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
              Raison auditable
              <textarea
                v-model="flagForm.reason"
                rows="3"
                :required="flagForm.critical"
                placeholder="Obligatoire pour les flags critiques."
              />
              <span v-if="formIsCriticalWithoutReason" class="text-xs text-coursia-danger">
                Ajoute une raison d’au moins 10 caractères.
              </span>
            </label>
          </div>

          <BaseButton class="mt-5 w-full" type="submit" :disabled="isSaving || !canSaveFlag">
            {{ isSaving ? 'Enregistrement...' : 'Enregistrer le flag' }}
          </BaseButton>
        </form>

        <div class="rounded-3xl border border-coursia-border bg-coursia-surface-muted p-5">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">
            Garde-fous
          </p>
          <ul class="mt-4 grid gap-3 text-sm leading-6 text-coursia-muted">
            <li v-for="guardrail in guardrails" :key="guardrail" class="flex gap-3">
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-coursia-primary" />
              <span>{{ guardrail }}</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </section>
</template>
