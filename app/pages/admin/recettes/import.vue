<script setup lang="ts">
import { recipeCsvColumns, recipeCsvTemplate, type RecipeCsvImportReport } from '#shared/validation/recipe-import'

definePageMeta({
  layout: 'admin',
})

type RowAction = RecipeCsvImportReport['rows'][number]['action']
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const fileName = ref('recettes.csv')
const content = ref(recipeCsvTemplate)
const dryRun = ref(true)
const feedback = ref('')
const errorMessage = ref('')
const loading = ref(false)
const report = ref<RecipeCsvImportReport | null>(null)
const idempotentReplay = ref(false)
const templateHref = '/api/admin/recipes/import/template'

const csvLineCount = computed(() => content.value.trim().split(/\r?\n/).filter(Boolean).length)
const rowsToReview = computed(() => report.value?.rows.filter((row) => row.action === 'error' || row.action === 'duplicate') ?? [])
const canExecute = computed(() => report.value && report.value.errors === 0 && report.value.duplicates === 0)

const actionLabel = (action: RowAction) => {
  const labels: Record<RowAction, string> = {
    create: 'Création',
    update: 'Mise à jour',
    duplicate: 'Doublon',
    error: 'Erreur',
  }

  return labels[action]
}

const actionTone = (action: RowAction): BadgeTone => {
  if (action === 'create') return 'success'
  if (action === 'update') return 'primary'
  if (action === 'duplicate') return 'warning'

  return 'danger'
}

const runImport = async (forceDryRun = dryRun.value) => {
  feedback.value = ''
  errorMessage.value = ''
  report.value = null
  loading.value = true

  try {
    const response = await $fetch<{ data: RecipeCsvImportReport; idempotentReplay: boolean }>(
      '/api/admin/recipes/import',
      {
        method: 'POST',
        body: {
          fileName: fileName.value,
          content: content.value,
          dryRun: forceDryRun,
        },
      },
    )

    report.value = response.data
    dryRun.value = response.data.dryRun
    idempotentReplay.value = response.idempotentReplay
    feedback.value = response.idempotentReplay
      ? 'Même fichier reconnu : rapport idempotent réutilisé.'
      : response.data.dryRun
        ? 'Dry-run terminé. Corrige les erreurs avant import réel.'
        : 'Import exécuté et rapport conservé.'
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : 'Import refusé : erreurs ou doublons à corriger avant exécution.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-100</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          Import CSV de recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Prévisualise les créations, mises à jour, doublons et erreurs avant d’écrire dans le catalogue officiel.
        </p>
      </div>

      <a
        :href="templateHref"
        class="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm font-semibold text-[#101828] transition hover:bg-[#fbfaf7]"
      >
        Télécharger le modèle CSV
      </a>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Lignes</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ Math.max(csvLineCount - 1, 0) }}</p>
        <p class="mt-1 text-xs text-[#667085]">hors en-tête</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Créations</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ report?.creates ?? 0 }}</p>
        <p class="mt-1 text-xs text-[#667085]">recettes nouvelles</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Mises à jour</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ report?.updates ?? 0 }}</p>
        <p class="mt-1 text-xs text-[#667085]">slugs existants</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">À corriger</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ rowsToReview.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">erreurs ou doublons</p>
      </article>
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]" @submit.prevent="runImport(true)">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Prévisualisation</p>
            <h2 class="mt-2 text-lg font-semibold text-[#101828]">Fichier à importer</h2>
          </div>
          <BaseBadge :tone="dryRun ? 'warning' : 'danger'">
            {{ dryRun ? 'Dry-run' : 'Import réel' }}
          </BaseBadge>
        </div>

        <label class="mt-5 grid gap-1.5 text-xs font-semibold text-[#344054]">
          Nom du fichier
          <input
            v-model="fileName"
            class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary"
          >
        </label>

        <div class="mt-4 rounded-2xl bg-[#fbfaf7] p-4 text-xs text-[#667085]">
          Colonnes attendues :
          <span class="font-mono">{{ recipeCsvColumns.join(', ') }}</span>
        </div>

        <label class="mt-4 grid gap-1.5 text-xs font-semibold text-[#344054]">
          Contenu CSV
          <textarea
            v-model="content"
            rows="16"
            class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 font-mono text-xs leading-6 outline-none transition focus:border-coursia-primary"
          />
        </label>

        <label class="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-[#e6e1d8] px-3 py-2.5 text-sm text-[#344054]">
          <input v-model="dryRun" type="checkbox">
          Dry-run uniquement
        </label>

        <div class="mt-5 flex flex-wrap gap-2">
          <BaseButton type="submit" :disabled="loading">
            {{ loading ? 'Analyse...' : 'Prévisualiser' }}
          </BaseButton>
          <BaseButton
            type="button"
            variant="secondary"
            :disabled="loading || !canExecute"
            @click="runImport(false)"
          >
            Exécuter l’import
          </BaseButton>
        </div>
      </form>

      <aside class="grid gap-5">
        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
          <h2 class="text-sm font-semibold text-[#101828]">Règles de sécurité</h2>
          <ul class="mt-4 space-y-3 text-sm text-[#667085]">
            <li>Le dry-run ne modifie pas les données.</li>
            <li>L’import réel est bloqué si des erreurs ou doublons existent.</li>
            <li>Relancer le même fichier réutilise le rapport idempotent.</li>
            <li>Les erreurs restent liées à une ligne et un champ précis.</li>
          </ul>
        </article>

        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5">
          <h2 class="text-sm font-semibold text-[#101828]">Dernier rapport</h2>
          <p class="mt-3 break-all text-sm text-[#667085]">
            {{ report ? report.idempotencyKey : 'Aucun rapport généré.' }}
          </p>
          <BaseBadge v-if="idempotentReplay" class="mt-3" tone="primary">Rejeu idempotent</BaseBadge>
        </article>
      </aside>
    </div>

    <section v-if="report" class="admin-table mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Rapport d’import</h2>
          <p class="mt-1 text-xs text-[#667085]">
            {{ report.dryRun ? 'Prévisualisation sans écriture' : 'Import réel exécuté' }}
          </p>
        </div>
        <BaseBadge :tone="canExecute ? 'success' : 'warning'">
          {{ canExecute ? 'Prêt à exécuter' : 'Correction requise' }}
        </BaseBadge>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#eee8df] text-sm">
          <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
            <tr>
              <th class="px-5 py-3">Ligne</th>
              <th class="px-5 py-3">Action</th>
              <th class="px-5 py-3">Slug</th>
              <th class="px-5 py-3">Champ</th>
              <th class="px-5 py-3">Message</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df]">
            <tr v-for="row in report.rows" :key="`${row.rowNumber}-${row.slug}-${row.action}`" class="transition hover:bg-[#fbfaf7]">
              <td class="px-5 py-4 text-[#667085]">{{ row.rowNumber }}</td>
              <td class="px-5 py-4">
                <BaseBadge :tone="actionTone(row.action)">{{ actionLabel(row.action) }}</BaseBadge>
              </td>
              <td class="px-5 py-4 font-medium text-[#101828]">{{ row.slug || '—' }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ row.field || '—' }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ row.message || 'Prêt' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
