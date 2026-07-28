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
const loading = ref(false)

const resetForm = () => {
  selectedRetailerId.value = null
  Object.assign(form, {
    name: '',
    slug: '',
    status: 'active',
    websiteUrl: undefined,
  })
}

const selectRetailer = (retailer: Record<string, unknown>) => {
  selectedRetailerId.value = String(retailer.id)
  Object.assign(form, {
    name: String(retailer.name ?? ''),
    slug: String(retailer.slug ?? ''),
    status: retailer.status === 'archived' ? 'archived' : 'active',
    websiteUrl: retailer.website_url ? String(retailer.website_url) : undefined,
  })
}

const loadRetailers = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/retailers', {
      query: filters,
    })
    retailers.value = response.data
  } finally {
    loading.value = false
  }
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

onMounted(() => {
  void loadRetailers()
})
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-102</p>
        <h1 class="mt-2 text-3xl font-black">Enseignes du comparateur</h1>
        <p class="mt-3 text-coursia-muted">
          Gestion des enseignes utilisées par les produits, les prix courants et l’historique.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="resetForm">Nouvelle enseigne</BaseButton>
        <BaseButton type="button" :disabled="loading" @click="loadRetailers">Rafraîchir</BaseButton>
      </div>
    </div>

    <form class="admin-toolbar grid gap-3 md:grid-cols-[1fr_16rem_auto]" @submit.prevent="loadRetailers">
      <label class="grid gap-1 text-sm font-bold">
        Recherche
        <input v-model="filters.search" type="search" placeholder="Nom, slug, URL..." />
      </label>
      <label class="grid gap-1 text-sm font-bold">
        Statut
        <select v-model="filters.status">
          <option value="">Tous statuts</option>
          <option value="active">Actif</option>
          <option value="archived">Archivé</option>
        </select>
      </label>
      <div class="flex items-end">
        <BaseButton type="submit" class="w-full" :disabled="loading">Filtrer</BaseButton>
      </div>
    </form>

    <p v-if="feedback" class="rounded-xl border border-coursia-border bg-coursia-surface px-4 py-3 text-sm font-semibold">
      {{ feedback }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <section class="rounded-xl border border-coursia-border bg-coursia-surface p-4">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-base font-black">Liste des enseignes</h2>
          <span class="text-sm text-coursia-muted">{{ retailers.length }} entrée(s)</span>
        </div>

        <div v-if="loading" class="rounded-xl bg-coursia-background p-4 text-sm text-coursia-muted">
          Chargement...
        </div>
        <div v-else class="overflow-x-auto">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Enseigne</th>
                <th>Statut</th>
                <th>Source</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="retailer in retailers" :key="String(retailer.id)">
                <td>
                  <button type="button" class="text-left" @click="selectRetailer(retailer)">
                    <span class="block font-black">{{ retailer.name }}</span>
                    <span class="block text-xs text-coursia-muted">{{ retailer.slug }}</span>
                  </button>
                </td>
                <td>{{ retailer.status }}</td>
                <td>{{ retailer.website_url || 'source interne' }}</td>
                <td>
                  <div class="flex justify-end gap-2">
                    <BaseButton size="sm" variant="secondary" type="button" @click="selectRetailer(retailer)">Modifier</BaseButton>
                    <BaseButton size="sm" variant="ghost" type="button" @click="archiveRetailer(retailer)">Archiver</BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <form class="rounded-xl border border-coursia-border bg-coursia-surface p-4" @submit.prevent="saveRetailer">
        <h2 class="text-base font-black">{{ selectedRetailerId ? 'Modifier l’enseigne' : 'Créer une enseigne' }}</h2>
        <label class="mt-4 grid gap-1 text-sm font-bold">
          Nom
          <input v-model="form.name" required />
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Slug
          <input v-model="form.slug" required />
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Statut
          <select v-model="form.status">
            <option value="active">Actif</option>
            <option value="archived">Archivé</option>
          </select>
        </label>
        <label class="mt-3 grid gap-1 text-sm font-bold">
          Site / source publique
          <input v-model="form.websiteUrl" />
        </label>
        <BaseButton class="mt-5" type="submit">Enregistrer</BaseButton>
      </form>
    </div>
  </section>
</template>
