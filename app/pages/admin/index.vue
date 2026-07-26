<script setup lang="ts">
import { adminDashboardIndicators } from '#shared/admin/dashboard'

definePageMeta({
  layout: 'admin',
})

const status = ref<'loading' | 'ready' | 'empty' | 'error'>('ready')
const refreshedAt = ref(new Date().toISOString())

const refreshDashboard = () => {
  status.value = 'loading'
  refreshedAt.value = new Date().toISOString()
  status.value = adminDashboardIndicators.length > 0 ? 'ready' : 'empty'
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black tracking-tight">Tableau de bord administrateur</h1>
        <p class="mt-3 text-coursia-muted">
          Point d’entrée sécurisé vers les tâches administratives de Coursia.
        </p>
      </div>
      <BaseButton type="button" @click="refreshDashboard">Rafraîchir</BaseButton>
    </div>

    <p class="mt-4 text-sm text-coursia-muted">Dernier rafraîchissement : {{ refreshedAt }}</p>

    <div v-if="status === 'loading'" class="mt-8 rounded-coursia-xl bg-coursia-surface p-6">
      Chargement du tableau de bord...
    </div>
    <div v-else-if="status === 'empty'" class="mt-8 rounded-coursia-xl bg-coursia-surface p-6">
      Aucun indicateur disponible pour ce rôle.
    </div>
    <div v-else-if="status === 'error'" class="mt-8 rounded-coursia-xl bg-coursia-surface p-6 text-coursia-danger">
      Impossible de charger les indicateurs. Réessayez plus tard.
    </div>

    <div v-else class="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
      <NuxtLink
        v-for="indicator in adminDashboardIndicators"
        :key="indicator.label"
        :to="indicator.href"
        class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm"
      >
        <p class="text-sm text-coursia-muted">{{ indicator.label }}</p>
        <p class="mt-3 text-4xl font-black">{{ indicator.value }}</p>
        <p
          class="mt-3 text-xs font-black uppercase tracking-[0.16em]"
          :class="indicator.status === 'danger' ? 'text-coursia-danger' : indicator.status === 'warning' ? 'text-coursia-warning' : 'text-coursia-success'"
        >
          {{ indicator.status }}
        </p>
      </NuxtLink>
    </div>
  </section>
</template>

