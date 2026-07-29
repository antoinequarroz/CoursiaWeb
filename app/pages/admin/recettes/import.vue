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

const csvLines = computed(() => content.value.trim().split(/\r?\n/).filter(Boolean))
const csvLineCount = computed(() => csvLines.value.length)
const dataLineCount = computed(() => Math.max(csvLineCount.value - 1, 0))
const reportRows = computed(() => report.value?.rows ?? [])
const rowsToReview = computed(() =>
  reportRows.value.filter((row) => row.action === 'error' || row.action === 'duplicate'),
)
const canExecute = computed(() =>
  Boolean(report.value && report.value.errors === 0 && report.value.duplicates === 0 && report.value.dryRun),
)
const importMode = computed(() => dryRun.value ? 'Prévisualisation' : 'Import réel')
const stepStatus = computed(() => {
  if (!report.value) return 'Préparer'
  if (rowsToReview.value.length > 0) return 'Corriger'
  if (report.value.dryRun) return 'Prêt'
  return 'Importé'
})
const reportTone = computed<BadgeTone>(() => {
  if (!report.value) return 'neutral'
  if (rowsToReview.value.length > 0) return 'warning'
  if (report.value.dryRun) return 'success'
  return 'primary'
})
const csvPreviewRows = computed(() => {
  const [headerLine = '', ...rows] = csvLines.value
  const headers = headerLine.split(',').map((header) => header.trim())

  return rows.slice(0, 4).map((line, index) => ({
    rowNumber: index + 2,
    values: parsePreviewLine(line, headers),
  }))
})

function parsePreviewLine(line: string, headers: string[]) {
  const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map((value) =>
    value.replace(/^"|"$/g, '').trim(),
  ) ?? []

  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
}

function actionLabel(action: RowAction) {
  const labels: Record<RowAction, string> = {
    create: 'Création',
    update: 'Mise à jour',
    duplicate: 'Doublon',
    error: 'Erreur',
  }

  return labels[action]
}

function actionTone(action: RowAction): BadgeTone {
  if (action === 'create') return 'success'
  if (action === 'update') return 'primary'
  if (action === 'duplicate') return 'warning'

  return 'danger'
}

function clearReport() {
  report.value = null
  feedback.value = ''
  errorMessage.value = ''
  idempotentReplay.value = false
}

function resetTemplate() {
  content.value = recipeCsvTemplate
  fileName.value = 'recettes.csv'
  dryRun.value = true
  clearReport()
}

async function runImport(forceDryRun = dryRun.value) {
  feedback.value = ''
  errorMessage.value = ''
  report.value = null
  loading.value = true

  try {
    const response = await $fetch<{ data: RecipeCsvImportReport, idempotentReplay: boolean }>(
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
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-100 · CSV</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Import CSV de recettes
        </h1>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-coursia-muted">
          Prévisualise les créations, mises à jour, doublons et erreurs avant d’écrire dans le catalogue officiel.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <a
          :href="templateHref"
          class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-text transition hover:bg-coursia-surface-muted"
        >
          Télécharger le modèle
        </a>
        <BaseButton type="button" variant="secondary" @click="resetTemplate">
          Réinitialiser
        </BaseButton>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-5">
      <article class="admin-stat-card">
        <span>Étape</span>
        <strong class="text-coursia-primary">{{ stepStatus }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Lignes</span>
        <strong>{{ dataLineCount }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Créations</span>
        <strong class="text-coursia-success">{{ report?.creates ?? 0 }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>Mises à jour</span>
        <strong>{{ report?.updates ?? 0 }}</strong>
      </article>
      <article class="admin-stat-card">
        <span>À corriger</span>
        <strong class="text-coursia-warning">{{ rowsToReview.length }}</strong>
      </article>
    </div>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_27rem]">
      <form class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm" @submit.prevent="runImport(true)">
        <div class="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-coursia-primary">Prévisualisation</p>
            <h2 class="mt-2 text-lg font-semibold text-coursia-text">Fichier à contrôler</h2>
            <p class="mt-2 text-sm text-coursia-muted">
              Le dry-run appelle la validation Supabase sans publier les recettes.
            </p>
          </div>
          <BaseBadge :tone="dryRun ? 'warning' : 'danger'">
            {{ importMode }}
          </BaseBadge>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
          <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
            Nom du fichier
            <input v-model="fileName" required placeholder="recettes.csv">
          </label>
          <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-coursia-border bg-coursia-surface-muted px-3 py-2.5 text-sm font-semibold text-coursia-text">
            <input v-model="dryRun" type="checkbox" class="h-4 w-4 accent-coursia-primary">
            Dry-run uniquement
          </label>
        </div>

        <div class="mt-4 rounded-2xl border border-coursia-border bg-coursia-surface-muted p-3">
          <p class="text-xs font-semibold uppercase tracking-[0.14em] text-coursia-muted">Colonnes attendues</p>
          <p class="mt-2 break-words font-mono text-xs leading-5 text-coursia-text">
            {{ recipeCsvColumns.join(', ') }}
          </p>
        </div>

        <label class="mt-4 grid gap-1.5 text-xs font-semibold text-coursia-text">
          Contenu CSV
          <textarea v-model="content" rows="18" class="font-mono text-xs leading-6" />
        </label>

        <div class="mt-4 flex flex-wrap gap-2 border-t border-coursia-border pt-4">
          <BaseButton type="submit" :disabled="loading || dataLineCount === 0">
            {{ loading ? 'Analyse...' : 'Prévisualiser' }}
          </BaseButton>
          <BaseButton type="button" variant="secondary" :disabled="loading || !canExecute" @click="runImport(false)">
            Exécuter l’import
          </BaseButton>
        </div>
      </form>

      <aside class="grid gap-4">
        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-semibold text-coursia-text">Garde-fous</h2>
          <div class="mt-4 grid gap-2">
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <p class="text-sm font-semibold text-coursia-text">1. Dry-run obligatoire</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">Aucune écriture tant que le rapport contient des erreurs.</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <p class="text-sm font-semibold text-coursia-text">2. Idempotence</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">Relancer le même fichier réutilise le rapport déjà conservé.</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <p class="text-sm font-semibold text-coursia-text">3. Traçabilité</p>
              <p class="mt-1 text-xs leading-5 text-coursia-muted">Le rapport est relié au fichier, à l’utilisateur et à l’audit admin.</p>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-coursia-text">Aperçu rapide</h2>
              <p class="mt-1 text-xs text-coursia-muted">{{ dataLineCount }} ligne(s) de données détectée(s).</p>
            </div>
            <BaseBadge :tone="reportTone">{{ report ? stepStatus : 'Local' }}</BaseBadge>
          </div>

          <div class="mt-4 grid gap-2">
            <div v-for="row in csvPreviewRows" :key="row.rowNumber" class="rounded-2xl bg-coursia-surface-muted p-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-semibold text-coursia-text">Ligne {{ row.rowNumber }}</p>
                <BaseBadge tone="neutral">{{ row.values.status || 'draft' }}</BaseBadge>
              </div>
              <p class="mt-2 truncate text-xs text-coursia-muted">{{ row.values.title || row.values.slug || 'Sans titre' }}</p>
            </div>
            <p v-if="csvPreviewRows.length === 0" class="rounded-2xl bg-coursia-surface-muted p-3 text-sm text-coursia-muted">
              Aucune ligne de données à prévisualiser.
            </p>
          </div>
        </article>

        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <h2 class="text-base font-semibold text-coursia-text">Dernier rapport</h2>
          <p class="mt-3 break-all rounded-2xl bg-coursia-surface-muted p-3 text-xs leading-5 text-coursia-muted">
            {{ report ? report.idempotencyKey : 'Aucun rapport généré.' }}
          </p>
          <BaseBadge v-if="idempotentReplay" class="mt-3" tone="primary">Rejeu idempotent</BaseBadge>
        </article>
      </aside>
    </div>

    <section v-if="report" class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
      <div class="flex flex-col justify-between gap-3 border-b border-coursia-border px-4 py-3 md:flex-row md:items-center">
        <div>
          <h2 class="text-base font-semibold text-coursia-text">Rapport d’import</h2>
          <p class="mt-1 text-xs text-coursia-muted">
            {{ report.dryRun ? 'Prévisualisation sans écriture' : 'Import réel exécuté' }}
          </p>
        </div>
        <BaseBadge :tone="reportTone">
          {{ canExecute ? 'Prêt à exécuter' : rowsToReview.length > 0 ? 'Correction requise' : 'Terminé' }}
        </BaseBadge>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[58rem]">
          <thead>
            <tr>
              <th>Ligne</th>
              <th>Action</th>
              <th>Slug</th>
              <th>Champ</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in reportRows" :key="`${row.rowNumber}-${row.slug}-${row.action}`">
              <td class="text-sm text-coursia-muted">{{ row.rowNumber }}</td>
              <td>
                <BaseBadge :tone="actionTone(row.action)">{{ actionLabel(row.action) }}</BaseBadge>
              </td>
              <td class="font-semibold text-coursia-text">{{ row.slug || '—' }}</td>
              <td class="text-sm text-coursia-muted">{{ row.field || '—' }}</td>
              <td class="text-sm text-coursia-muted">{{ row.message || 'Prêt' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
