<script setup lang="ts">
import type { FeatureFlagInput } from '#shared/validation/content-settings'

definePageMeta({
  layout: 'admin',
})

const flagForm = reactive<FeatureFlagInput>({
  key: '',
  name: '',
  description: '',
  enabled: false,
  critical: false,
  rolloutPercentage: 0,
  reason: '',
})

const flags = ref<Array<Record<string, unknown>>>([])
const feedback = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

const loadFlags = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/feature-flags')
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
      ? 'Feature flag critique protege et audite avec raison.'
      : 'Feature flag non technique enregistre et audite.'
    await loadFlags()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d enregistrer le feature flag.'
  } finally {
    isSaving.value = false
  }
}

const selectFlag = (flag: Record<string, unknown>) => {
  flagForm.key = String(flag.key ?? '')
  flagForm.name = String(flag.name ?? '')
  flagForm.description = String(flag.description ?? '')
  flagForm.enabled = Boolean(flag.enabled)
  flagForm.critical = Boolean(flag.critical)
  flagForm.rolloutPercentage = Number(flag.rollout_percentage ?? 0)
  flagForm.reason = flagForm.critical ? `Mise a jour controlee du flag ${flagForm.key}` : ''
}

onMounted(() => {
  void loadFlags()
})
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-106</p>
        <h1 class="mt-2 text-3xl font-black">Parametres non techniques</h1>
        <p class="mt-3 max-w-3xl text-coursia-muted">
          Feature flags et reglages simples, sans secrets ni configuration technique. Les flags critiques
          exigent un role administrateur, une raison et une trace d audit.
        </p>
      </div>
      <BaseButton type="button" @click="loadFlags">Rafraichir</BaseButton>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>
    <p v-if="errorMessage" class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{{ errorMessage }}</p>

    <section class="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-2xl font-black">Feature flags</h2>
        <p v-if="isLoading" class="mt-5 text-sm text-coursia-muted">Chargement des flags...</p>
        <p v-else-if="flags.length === 0" class="mt-5 text-sm text-coursia-muted">Aucun flag trouve. Le seed doit afficher les flags de depart.</p>
        <div class="mt-5 grid gap-4">
          <button
            v-for="flag in flags"
            :key="String(flag.id)"
            type="button"
            class="rounded-2xl border border-coursia-border bg-coursia-background p-4 text-left"
            @click="selectFlag(flag)"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-black">{{ flag.name }}</h3>
              <span class="rounded-full bg-coursia-surface-muted px-3 py-1 text-xs font-black">
                {{ flag.enabled ? 'active' : 'inactif' }} - {{ flag.critical ? 'critique' : 'standard' }}
              </span>
            </div>
            <p class="mt-2 text-sm text-coursia-muted">{{ flag.description }}</p>
            <p class="mt-2 text-xs text-coursia-muted">
              Cle {{ flag.key }} - rollout {{ flag.rollout_percentage }}%
            </p>
          </button>
        </div>
      </article>

      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveFlag">
        <h2 class="text-2xl font-black">Reglage protege</h2>
        <label class="mt-5 grid gap-2 text-sm font-bold">
          Cle non sensible
          <input v-model="flagForm.key" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Nom
          <input v-model="flagForm.name" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Description
          <textarea v-model="flagForm.description" rows="4" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 flex items-center gap-3 text-sm font-bold">
          <input v-model="flagForm.enabled" type="checkbox" />
          Active
        </label>
        <label class="mt-4 flex items-center gap-3 text-sm font-bold">
          <input v-model="flagForm.critical" type="checkbox" />
          Feature flag critique protege
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Rollout %
          <input v-model.number="flagForm.rolloutPercentage" type="number" min="0" max="100" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Raison auditable pour flag critique
          <textarea v-model="flagForm.reason" rows="3" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <p class="mt-4 text-sm text-coursia-muted">
          Les cles contenant secret, token, password, service_role ou api_key sont refusees.
        </p>
        <BaseButton class="mt-6" type="submit" :disabled="isSaving">
          {{ isSaving ? 'Enregistrement...' : 'Enregistrer le flag' }}
        </BaseButton>
      </form>
    </section>
  </section>
</template>
