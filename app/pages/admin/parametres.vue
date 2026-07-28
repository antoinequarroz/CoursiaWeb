<script setup lang="ts">
import type { FeatureFlagInput } from '#shared/validation/content-settings'

definePageMeta({
  layout: 'admin',
})

type FlagRecord = Record<string, unknown>
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

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
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

const activeCount = computed(() => flags.value.filter((flag) => Boolean(flag.enabled)).length)
const criticalCount = computed(() => flags.value.filter((flag) => Boolean(flag.critical)).length)
const averageRollout = computed(() => {
  if (flags.value.length === 0) return 0
  const total = flags.value.reduce((sum, flag) => sum + Number(flag.rollout_percentage ?? flag.rolloutPercentage ?? 0), 0)
  return Math.round(total / flags.value.length)
})

const flagTone = (flag: FlagRecord): BadgeTone => {
  if (flag.critical) return 'danger'
  if (flag.enabled) return 'success'
  return 'neutral'
}

const resetForm = () => {
  Object.assign(flagForm, createEmptyFlag())
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
      : 'Feature flag non technique enregistré et audité.'
    resetForm()
    await loadFlags()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’enregistrer le feature flag.'
  } finally {
    isSaving.value = false
  }
}

const selectFlag = (flag: FlagRecord) => {
  flagForm.key = String(flag.key ?? '')
  flagForm.name = String(flag.name ?? '')
  flagForm.description = String(flag.description ?? '')
  flagForm.enabled = Boolean(flag.enabled)
  flagForm.critical = Boolean(flag.critical)
  flagForm.rolloutPercentage = Number(flag.rollout_percentage ?? flag.rolloutPercentage ?? 0)
  flagForm.reason = flagForm.critical ? `Mise à jour contrôlée du flag ${flagForm.key}` : ''
}

onMounted(loadFlags)
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-106</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Paramètres non techniques
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Feature flags et réglages simples, sans secrets ni configuration technique. Les flags
          critiques exigent une raison auditable.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="resetForm">Nouveau flag</BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadFlags">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Flags</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ flags.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">chargés</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Actifs</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ activeCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">enabled</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Critiques</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ criticalCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">raison requise</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Rollout moyen</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ averageRollout }}%</p>
        <p class="mt-1 text-xs text-[#667085]">sur les flags</p>
      </article>
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section class="admin-table overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
        <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#101828]">Feature flags</h2>
            <p class="mt-1 text-xs text-[#667085]">Clique une ligne pour modifier le réglage.</p>
          </div>
          <BaseBadge tone="neutral">Sans secrets</BaseBadge>
        </div>
        <div v-if="isLoading" class="p-5 text-sm text-[#667085]">Chargement des flags...</div>
        <div v-else-if="flags.length === 0" class="p-5 text-sm text-[#667085]">Aucun flag trouvé.</div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#eee8df] text-sm">
            <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
              <tr>
                <th class="px-5 py-3">Flag</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3">Rollout</th>
                <th class="px-5 py-3">Critique</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eee8df]">
              <tr v-for="flag in flags" :key="String(flag.id ?? flag.key)" class="cursor-pointer transition hover:bg-[#fbfaf7]" @click="selectFlag(flag)">
                <td class="px-5 py-4">
                  <span class="block font-semibold text-[#101828]">{{ flag.name }}</span>
                  <span class="mt-1 block text-xs text-[#667085]">{{ flag.key }}</span>
                  <span class="mt-2 block text-xs text-[#98a2b3]">{{ flag.description }}</span>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="flagTone(flag)">{{ flag.enabled ? 'Actif' : 'Inactif' }}</BaseBadge>
                </td>
                <td class="px-5 py-4 text-[#667085]">{{ flag.rollout_percentage ?? flag.rolloutPercentage ?? 0 }}%</td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="flag.critical ? 'danger' : 'neutral'">
                    {{ flag.critical ? 'Critique' : 'Standard' }}
                  </BaseBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]" @submit.prevent="saveFlag">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Réglage protégé</p>
        <h2 class="mt-2 text-lg font-semibold text-[#101828]">Feature flag</h2>

        <div class="mt-5 grid gap-4">
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Clé non sensible
            <input v-model="flagForm.key" required class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Nom
            <input v-model="flagForm.name" required class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Description
            <textarea v-model="flagForm.description" rows="4" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary" />
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex items-center gap-3 rounded-xl border border-[#e6e1d8] px-3 py-2.5 text-sm text-[#344054]">
              <input v-model="flagForm.enabled" type="checkbox">
              Actif
            </label>
            <label class="flex items-center gap-3 rounded-xl border border-[#e6e1d8] px-3 py-2.5 text-sm text-[#344054]">
              <input v-model="flagForm.critical" type="checkbox">
              Critique
            </label>
          </div>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Rollout %
            <input v-model.number="flagForm.rolloutPercentage" type="number" min="0" max="100" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>
          <label class="grid gap-1.5 text-xs font-semibold text-[#344054]">
            Raison auditable pour flag critique
            <textarea v-model="flagForm.reason" rows="3" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary" />
          </label>
        </div>

        <div class="mt-5 rounded-2xl bg-[#fbfaf7] p-4 text-xs text-[#667085]">
          Les clés contenant secret, token, password, service_role ou api_key sont refusées.
        </div>

        <BaseButton class="mt-5 w-full" type="submit" :disabled="isSaving">
          {{ isSaving ? 'Enregistrement...' : 'Enregistrer le flag' }}
        </BaseButton>
      </form>
    </div>
  </section>
</template>
