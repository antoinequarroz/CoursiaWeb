<script setup lang="ts">
import { recipeCsvColumns, recipeCsvTemplate, type RecipeCsvImportReport } from '#shared/validation/recipe-import'

definePageMeta({
  layout: 'admin',
})

const fileName = ref('recettes.csv')
const content = ref(recipeCsvTemplate)
const dryRun = ref(true)
const feedback = ref('')
const report = ref<RecipeCsvImportReport | null>(null)
const templateHref = '/api/admin/recipes/import/template'

const runImport = async () => {
  feedback.value = ''
  report.value = null

  try {
    const response = await $fetch<{ data: RecipeCsvImportReport; idempotentReplay: boolean }>(
      '/api/admin/recipes/import',
      {
        method: 'POST',
        body: {
          fileName: fileName.value,
          content: content.value,
          dryRun: dryRun.value,
        },
      },
    )

    report.value = response.data
    feedback.value = response.idempotentReplay
      ? 'Même fichier reconnu : rapport idempotent réutilisé.'
      : 'Rapport d’import conservé.'
  } catch {
    feedback.value = 'Import refusé : erreurs ou doublons à corriger avant exécution.'
  }
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black">Import CSV de recettes</h1>
        <p class="mt-3 text-coursia-muted">
          Dry-run avec créations, mises à jour, doublons, erreurs ligne/champ et rapport conservé.
        </p>
      </div>
      <a :href="templateHref" class="rounded-coursia-md bg-coursia-primary px-4 py-2.5 text-sm font-black text-white">
        Télécharger le modèle CSV
      </a>
    </div>

    <form class="mt-8 rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="runImport">
      <p class="text-sm text-coursia-muted">Colonnes attendues : {{ recipeCsvColumns.join(', ') }}</p>
      <label class="mt-5 grid gap-2 text-sm font-bold">
        Nom du fichier
        <input v-model="fileName" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      </label>
      <label class="mt-5 grid gap-2 text-sm font-bold">
        Contenu CSV
        <textarea v-model="content" rows="12" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 font-mono text-sm" />
      </label>
      <label class="mt-5 flex gap-3 text-sm font-bold">
        <input v-model="dryRun" type="checkbox" />
        Dry-run uniquement
      </label>
      <BaseButton class="mt-6" type="submit">Prévisualiser l’import</BaseButton>
    </form>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>

    <section v-if="report" class="mt-8 rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
      <h2 class="text-2xl font-black">Rapport d’import</h2>
      <div class="mt-5 grid gap-4 md:grid-cols-4">
        <div class="rounded-2xl bg-coursia-background p-4">Créations : {{ report.creates }}</div>
        <div class="rounded-2xl bg-coursia-background p-4">Mises à jour : {{ report.updates }}</div>
        <div class="rounded-2xl bg-coursia-background p-4">Doublons : {{ report.duplicates }}</div>
        <div class="rounded-2xl bg-coursia-background p-4">Erreurs : {{ report.errors }}</div>
      </div>
      <div class="mt-5 overflow-x-auto">
        <table class="min-w-[760px] w-full text-left text-sm">
          <thead>
            <tr>
              <th class="py-3">Ligne</th>
              <th>Action</th>
              <th>Slug</th>
              <th>Champ</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in report.rows" :key="`${row.rowNumber}-${row.slug}`" class="border-t border-coursia-border">
              <td class="py-3">{{ row.rowNumber }}</td>
              <td>{{ row.action }}</td>
              <td>{{ row.slug }}</td>
              <td>{{ row.field }}</td>
              <td>{{ row.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

