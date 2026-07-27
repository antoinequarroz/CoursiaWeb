<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const search = reactive({
  userId: '',
  email: '',
})

const user = ref<Record<string, unknown> | null>(null)
const revenueCatEvents = ref<Array<Record<string, unknown>>>([])
const feedback = ref('')

const lookupSubscription = async () => {
  const response = await $fetch<{
    data: Record<string, unknown>
    revenueCatEvents: Array<Record<string, unknown>>
  }>('/api/admin/support-users/lookup', {
    query: {
      userId: search.userId || undefined,
      email: search.email || undefined,
    },
  })

  user.value = response.data
  revenueCatEvents.value = response.revenueCatEvents
  feedback.value = 'Consultation abonnement auditee, RevenueCat en lecture seule.'
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-105</p>
        <h1 class="mt-2 text-3xl font-black">Support abonnements</h1>
        <p class="mt-3 max-w-3xl text-coursia-muted">
          Vue lecture seule du palier d abonnement et des evenements RevenueCat utiles.
        </p>
      </div>
    </div>

    <form class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-[1fr_1fr_auto]" @submit.prevent="lookupSubscription">
      <input v-model="search.userId" placeholder="UUID utilisateur" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <input v-model="search.email" type="email" placeholder="email exact" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <BaseButton type="submit">Rechercher</BaseButton>
    </form>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <section v-if="user" class="mt-8 rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
      <h2 class="text-2xl font-black">Abonnement</h2>
      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-2xl bg-coursia-background p-4">Utilisateur : {{ user.emailMasked }}</div>
        <div class="rounded-2xl bg-coursia-background p-4">Palier : {{ user.subscriptionTier }}</div>
        <div class="rounded-2xl bg-coursia-background p-4">Statut compte : {{ user.accountStatus }}</div>
      </div>
    </section>

    <section class="mt-8 rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
      <h2 class="text-xl font-black">RevenueCat - lecture seule</h2>
      <div class="mt-4 grid gap-3">
        <div v-for="event in revenueCatEvents" :key="String(event.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
          {{ event.type }} - {{ event.entitlement || '-' }} - {{ event.product_id || '-' }} - expiration {{ event.expires_at || '-' }}
        </div>
      </div>
    </section>
  </section>
</template>
