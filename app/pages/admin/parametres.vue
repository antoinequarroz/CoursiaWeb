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

const createEmptyFlag = (): FeatureFlagInput => ({
  key: '',
  name: '',
  description: '',
  enabled: false,
  critical: false,
  rolloutPercentage: 0,
  reason: '',
})

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

const getRollout = (flag: FlagRecord) => Number(flag.rollout_percentage ?? flag.rolloutPercentage ?? 0)

const flagTone = (flag: FlagRecord): BadgeTone => {
  if (flag.critical) return 'danger'
  if (flag.enabled) return 'success'
  return 'neutral'
}

const statusLabel = (flag: FlagRecord) => {
  if (flag.critical) return flag.enabled ? 'Critique actif' : 'Critique inactif'
  return flag.enabled ? 'Actif' : 'Inactif'
}

const formatDate = (value: unknown) => {
  if (!value || typeof value !== 'string') return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const resetForm = () => {
  Object.assign(flagForm, createEmptyFlag())
  selectedKey.value = null
  feedback.value = ''
  errorMessage.value = ''
}

const loadFlags = async () => {
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

const saveFlag = async () => {
  isSaving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    await $fetch('/api/admin/feature-flags', {
      method: 'POST',
      body: flagForm,
    })
    feedback.value = flagForm.critical
      ? 'Feature flag critique protégé et audité avec raison.'
      : 'Feature flag enregistré et audité.'
    const savedKey = flagForm.key
    await loadFlags()
    selectedKey.value = savedKey
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’enregistrer le feature flag.'
  } finally {
    isSaving.value = false
  }
}

const selectFlag = (flag: FlagRecord) => {
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
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-106</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Paramètres non techniques
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Feature flags et réglages simples. Les secrets, tokens, clés serveur et paramètres techniques
          restent exclus de ce module.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="resetForm">
          Nouveau flag
        </BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadFlags">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-4">
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Flags</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ flags.length }}</p>
        <p class="mt-1 text-xs text-coursia-muted">chargés depuis Supabase</p>
      </article>
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Actifs</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ activeCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">{{ inactiveCount }} inactifs</p>
      </article>
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Critiques</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ criticalCount }}</p>
        <p class="mt-1 text-xs text-coursia-muted">raison auditable requise</p>
      </article>
      <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-coursia-muted">Rollout moyen</p>
        <p class="mt-3 text-2xl font-semibold text-coursia-text">{{ averageRollout }}%</p>
        <p class="mt-1 text-xs text-coursia-muted">sur les flags listés</p>
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
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-coursia-text">Feature flags</h2>
            <p class="mt-1 text-xs text-coursia-muted">
              Clique une ligne pour la charger dans le formulaire.
            </p>
          </div>
          <BaseBadge tone="neutral">Sans secrets</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">
          Chargement des flags...
        </div>
        <div v-else-if="flags.length === 0" class="p-5 text-sm text-coursia-muted">
          Aucun flag trouvé.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-coursia-border text-sm">
            <thead>
              <tr>
                <th class="px-5 py-3">Flag</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3">Rollout</th>
                <th class="px-5 py-3">Mise à jour</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-coursia-border">
              <tr
                v-for="flag in flags"
                :key="String(flag.id ?? flag.key)"
                class="cursor-pointer transition hover:bg-coursia-background"
                :class="selectedKey === String(flag.key) ? 'bg-coursia-primary/5' : ''"
                @click="selectFlag(flag)"
              >
                <td class="px-5 py-4">
                  <span class="block font-semibold text-coursia-text">{{ flag.name }}</span>
                  <span class="mt-1 block text-xs text-coursia-muted">{{ flag.key }}</span>
                  <span class="mt-2 line-clamp-2 block max-w-xl text-xs text-coursia-muted">{{ flag.description || 'Aucune description.' }}</span>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="flagTone(flag)">{{ statusLabel(flag) }}</BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <div class="flex min-w-[8rem] items-center gap-3">
                    <div class="h-2 flex-1 overflow-hidden rounded-full bg-coursia-background">
                      <div
                        class="h-full rounded-full bg-coursia-primary"
                        :style="{ width: `${getRollout(flag)}%` }"
                      />
                    </div>
                    <span class="w-10 text-right text-xs font-semibold text-coursia-muted">{{ getRollout(flag) }}%</span>
                  </div>
                </td>
                <td class="px-5 py-4 text-coursia-muted">
                  {{ formatDate(flag.updated_at ?? flag.created_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm" @submit.prevent="saveFlag">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Réglage protégé</p>
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
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-coursia-border bg-coursia-background px-3 py-2.5 text-sm text-coursia-muted">
              <input v-model="flagForm.enabled" class="cursor-pointer" type="checkbox">
              Actif
            </label>
            <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-coursia-border bg-coursia-background px-3 py-2.5 text-sm text-coursia-muted">
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
          </label>
        </div>

        <div class="mt-5 rounded-2xl border border-coursia-border bg-coursia-background p-4 text-xs text-coursia-muted">
          Les clés contenant secret, token, password, service_role, api_key ou credential sont refusées
          côté validation serveur.
        </div>

        <BaseButton class="mt-5 w-full" type="submit" :disabled="isSaving || !canSaveFlag">
          {{ isSaving ? 'Enregistrement...' : 'Enregistrer le flag' }}
        </BaseButton>
      </form>
    </div>
  </section>
</template>
