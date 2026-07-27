<script setup lang="ts">
import type { RetailerInput } from '#shared/validation/retail-catalog'

definePageMeta({
  layout: 'admin',
})

const form = reactive<RetailerInput>({
  name: '',
  slug: '',
  status: 'active',
  websiteUrl: undefined,
})

const filters = reactive({
  search: '',
  status: '',
})

const retailers = ref<Array<Record<string, unknown>>>([])
const selectedRetailerId = ref<string | null>(null)
const feedback = ref('')

const loadRetailers = async () => {
  const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/retailers', {
    query: filters,
  })
  retailers.value = response.data
}

const saveRetailer = async () => {
  const endpoint = selectedRetailerId.value ? `/api/admin/retailers/${selectedRetailerId.value}` : '/api/admin/retailers'
  const method = selectedRetailerId.value ? 'PUT' : 'POST'

  await $fetch(endpoint, { method, body: form })
  feedback.value = selectedRetailerId.value ? 'Enseigne modifiée et auditée.' : 'Enseigne créée et auditée.'
  await loadRetailers()
}

const archiveRetailer = async (retailer: Record<string, unknown>) => {
  await $fetch(`/api/admin/retailers/${String(retailer.id)}`, {
    method: 'PUT',
    body: {
      name: retailer.name,
      slug: retailer.slug,
      status: 'archived',
      websiteUrl: retailer.website_url || undefined,
    },
  })
  feedback.value = 'Enseigne archivée sans suppression des historiques de prix.'
  await loadRetailers()
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-102</p>
        <h1 class="mt-2 text-3xl font-black">Enseignes du comparateur</h1>
        <p class="mt-3 text-coursia-muted">
          CRUD des enseignes utilisées par les produits, les prix courants et lâ€™historique.
        </p>
      </div>
      <BaseButton type="button" @click="loadRetailers">Rafraîchir</BaseButton>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-2">
      <input v-model="filters.search" type="search" placeholder="Recherche enseigne" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      <select v-model="filters.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous statuts</option>
        <option value="active">Actif</option>
        <option value="archived">Archivé</option>
      </select>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <div class="mt-8 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
      <section class="grid gap-4">
        <article v-for="retailer in retailers" :key="String(retailer.id)" class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-xl font-black">{{ retailer.name }}</h2>
          <p class="mt-2 text-sm text-coursia-muted">{{ retailer.slug }} · {{ retailer.status }} · {{ retailer.website_url || 'source interne' }}</p>
          <BaseButton class="mt-4" size="sm" variant="secondary" type="button" @click="archiveRetailer(retailer)">
            Archiver
          </BaseButton>
        </article>
      </section>

      <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="saveRetailer">
        <h2 class="text-2xl font-black">Créer ou modifier une enseigne</h2>
        <label class="mt-5 grid gap-2 text-sm font-bold">
          Nom
          <input v-model="form.name" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Slug
          <input v-model="form.slug" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="mt-4 grid gap-2 text-sm font-bold">
          Site / source publique
          <input v-model="form.websiteUrl" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <BaseButton class="mt-6" type="submit">Enregistrer lâ€™enseigne</BaseButton>
      </form>
    </div>
  </section>
</template>
