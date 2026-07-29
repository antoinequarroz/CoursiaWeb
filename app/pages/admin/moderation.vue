<script setup lang="ts">
import {
  getCommunitySubmissionMissingChecks,
  type CommunityModerationDecisionInput,
  type CommunitySubmissionInput,
} from '#shared/validation/community-moderation'

definePageMeta({
  layout: 'admin',
})

type SubmissionRecord = Record<string, unknown>
type DecisionRecord = Record<string, unknown>
type Decision = CommunityModerationDecisionInput['decision']
type Priority = CommunitySubmissionInput['priority']
type ChecklistKey = keyof CommunityModerationDecisionInput['checklist']
type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

const filters = reactive({
  status: 'pending',
  priority: '',
  oldestFirst: true,
})

const submissionForm = reactive<CommunitySubmissionInput>({
  title: '',
  authorUserId: undefined,
  status: 'pending',
  priority: 'normal',
  recipePayload: {},
  photoAssetId: undefined,
  source: '',
  rights: '',
  allergens: [],
  checklist: {
    recipeChecked: false,
    photoChecked: false,
    sourceChecked: false,
    rightsChecked: false,
    allergensChecked: false,
  },
})

const decisionForm = reactive<CommunityModerationDecisionInput>({
  decision: 'request_correction',
  reason: '',
  checklist: {
    recipeChecked: false,
    photoChecked: false,
    sourceChecked: false,
    rightsChecked: false,
    allergensChecked: false,
  },
})

const submissions = ref<SubmissionRecord[]>([])
const decisions = ref<DecisionRecord[]>([])
const selectedSubmissionId = ref('')
const feedback = ref('')
const allergenInput = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const isHistoryOpen = ref(false)
const isCreateOpen = ref(false)

const checklistLabels: Record<ChecklistKey, string> = {
  recipeChecked: 'Recette',
  photoChecked: 'Photo',
  sourceChecked: 'Source',
  rightsChecked: 'Droits',
  allergensChecked: 'Allergènes',
}

const checklistDescriptions: Record<ChecklistKey, string> = {
  recipeChecked: 'Titre, portions, étapes et cohérence éditoriale.',
  photoChecked: 'Image conforme, lisible et exploitable.',
  sourceChecked: 'Origine identifiable et vérifiable.',
  rightsChecked: 'Droits, licence ou consentement connus.',
  allergensChecked: 'Allergènes et régimes sensibles contrôlés.',
}

const checklistKeys = Object.keys(checklistLabels) as ChecklistKey[]

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  correction_requested: 'Correction demandée',
  accepted: 'Acceptée',
  rejected: 'Refusée',
  archived: 'Archivée',
}

const priorityLabels: Record<Priority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
}

const decisionLabels: Record<Decision, string> = {
  accept: 'Accepter',
  reject: 'Refuser',
  request_correction: 'Demander correction',
  archive: 'Archiver',
}

const decisionHelp: Record<Decision, string> = {
  accept: 'Accepte la contribution et ferme la décision de modération.',
  reject: 'Refuse la soumission avec une raison obligatoire.',
  request_correction: 'Demande une correction claire à l’auteur.',
  archive: 'Retire la soumission de la file active.',
}

const missingChecks = computed(() => getCommunitySubmissionMissingChecks(decisionForm.checklist))
const completionRatio = computed(() => {
  const checked = checklistKeys.filter((key) => decisionForm.checklist[key]).length

  return Math.round((checked / checklistKeys.length) * 100)
})
const selectedSubmission = computed(() =>
  submissions.value.find((submission) => String(submission.id) === selectedSubmissionId.value) ?? null,
)
const urgentCount = computed(() =>
  submissions.value.filter((submission) => submission.priority === 'urgent' || submission.priority === 'high').length,
)
const pendingCount = computed(() =>
  submissions.value.filter((submission) => submission.status === 'pending').length,
)
const correctionCount = computed(() =>
  submissions.value.filter((submission) => submission.status === 'correction_requested').length,
)
const selectedAllergens = computed(() => {
  const value = selectedSubmission.value?.allergens

  return Array.isArray(value) ? value.map(String) : []
})
const selectedMissingChecks = computed(() => {
  const value = selectedSubmission.value?.missingChecks

  return Array.isArray(value) ? value.map(String) : []
})
const selectedRecipePayload = computed(() => {
  const value = selectedSubmission.value?.recipe_payload ?? selectedSubmission.value?.recipePayload

  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
})
const selectedRecipePreview = computed(() => ({
  portions: selectedRecipePayload.value.portions ?? selectedRecipePayload.value.servings ?? '—',
  duration: selectedRecipePayload.value.durationMinutes ?? selectedRecipePayload.value.duration ?? '—',
  ingredients: Array.isArray(selectedRecipePayload.value.ingredients) ? selectedRecipePayload.value.ingredients.length : '—',
  steps: Array.isArray(selectedRecipePayload.value.steps) ? selectedRecipePayload.value.steps.length : '—',
}))
const selectedStatusLabel = computed(() =>
  selectedSubmission.value ? statusLabels[String(selectedSubmission.value.status)] ?? String(selectedSubmission.value.status) : 'Aucune sélection',
)
const selectedPriorityLabel = computed(() =>
  selectedSubmission.value ? priorityLabels[String(selectedSubmission.value.priority) as Priority] ?? String(selectedSubmission.value.priority) : '—',
)
const canAccept = computed(() =>
  Boolean(selectedSubmissionId.value) && missingChecks.value.length === 0 && !isSaving.value,
)
const canReject = computed(() =>
  Boolean(selectedSubmissionId.value) && (decisionForm.reason ?? '').trim().length > 0 && !isSaving.value,
)

const moderationStats = computed(() => [
  { label: 'File filtrée', value: String(submissions.value.length), detail: 'soumissions visibles', tone: 'neutral' as BadgeTone },
  { label: 'En attente', value: String(pendingCount.value), detail: 'à traiter', tone: 'primary' as BadgeTone },
  { label: 'Prioritaires', value: String(urgentCount.value), detail: 'haute ou urgente', tone: urgentCount.value ? 'warning' as BadgeTone : 'success' as BadgeTone },
  { label: 'Corrections', value: String(correctionCount.value), detail: 'retours demandés', tone: correctionCount.value ? 'warning' as BadgeTone : 'neutral' as BadgeTone },
])

function priorityTone(priority: unknown): BadgeTone {
  if (priority === 'urgent') return 'danger'
  if (priority === 'high') return 'warning'
  if (priority === 'normal') return 'primary'
  return 'neutral'
}

function statusTone(status: unknown): BadgeTone {
  if (status === 'accepted') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'correction_requested') return 'warning'
  if (status === 'archived') return 'neutral'
  return 'primary'
}

function formatDate(value: unknown) {
  if (typeof value !== 'string' || !value) return '—'

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatSubmissionAge(submission: SubmissionRecord) {
  const age = submission.ageDays

  return typeof age === 'number' ? `${age} j` : '—'
}

function buildQueueQuery() {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    oldestFirst: filters.oldestFirst,
    limit: 50,
  }
}

function clearMessages() {
  feedback.value = ''
  errorMessage.value = ''
}

async function loadQueue() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: SubmissionRecord[] }>('/api/admin/community-moderation', {
      query: buildQueueQuery(),
    })
    submissions.value = response.data

    if (!selectedSubmissionId.value && submissions.value[0]) {
      selectSubmission(submissions.value[0])
    }
    else if (selectedSubmissionId.value && !submissions.value.some((submission) => String(submission.id) === selectedSubmissionId.value)) {
      selectedSubmissionId.value = ''
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger la file de modération.'
  } finally {
    isLoading.value = false
  }
}

async function loadDecisions() {
  try {
    const response = await $fetch<{ data: DecisionRecord[] }>('/api/admin/community-moderation/decisions', {
      query: { limit: 25 },
    })
    decisions.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les décisions.'
  }
}

function resetSubmissionForm() {
  submissionForm.title = ''
  submissionForm.authorUserId = undefined
  submissionForm.status = 'pending'
  submissionForm.priority = 'normal'
  submissionForm.recipePayload = {}
  submissionForm.photoAssetId = undefined
  submissionForm.source = ''
  submissionForm.rights = ''
  submissionForm.allergens = []
  Object.keys(submissionForm.checklist).forEach((key) => {
    submissionForm.checklist[key as keyof typeof submissionForm.checklist] = false
  })
}

async function createSubmission() {
  isSaving.value = true
  clearMessages()

  try {
    await $fetch('/api/admin/community-moderation', {
      method: 'POST',
      body: submissionForm,
    })
    feedback.value = 'Soumission ajoutée dans la file.'
    resetSubmissionForm()
    isCreateOpen.value = false
    await loadQueue()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’ajouter la soumission.'
  } finally {
    isSaving.value = false
  }
}

async function decide(decision: Decision) {
  decisionForm.decision = decision
  clearMessages()

  if (!selectedSubmissionId.value) {
    errorMessage.value = 'Sélectionne une soumission avant de décider.'
    return
  }

  if (decision === 'accept' && missingChecks.value.length > 0) {
    errorMessage.value = 'Toutes les vérifications doivent être terminées avant acceptation.'
    return
  }

  if (decision === 'reject' && !(decisionForm.reason ?? '').trim()) {
    errorMessage.value = 'Une raison est obligatoire pour refuser une soumission.'
    return
  }

  isSaving.value = true

  try {
    await $fetch(`/api/admin/community-moderation/${selectedSubmissionId.value}/decision`, {
      method: 'POST',
      body: {
        ...decisionForm,
        reason: (decisionForm.reason ?? '').trim() || undefined,
      },
    })

    feedback.value = decision === 'reject'
      ? 'Refus enregistré avec raison obligatoire et décision auditée.'
      : 'Décision de modération enregistrée et auditée.'
    decisionForm.reason = ''
    await Promise.all([loadQueue(), loadDecisions()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’enregistrer la décision.'
  } finally {
    isSaving.value = false
  }
}

function addAllergen() {
  const value = allergenInput.value.trim()

  if (value && !submissionForm.allergens.includes(value)) {
    submissionForm.allergens.push(value)
    allergenInput.value = ''
  }
}

function removeAllergen(allergen: string) {
  submissionForm.allergens = submissionForm.allergens.filter((item) => item !== allergen)
}

function selectSubmission(submission: SubmissionRecord) {
  selectedSubmissionId.value = String(submission.id)

  if (submission.checklist && typeof submission.checklist === 'object') {
    const checklist = submission.checklist as Partial<CommunityModerationDecisionInput['checklist']>
    decisionForm.checklist.recipeChecked = Boolean(checklist.recipeChecked)
    decisionForm.checklist.photoChecked = Boolean(checklist.photoChecked)
    decisionForm.checklist.sourceChecked = Boolean(checklist.sourceChecked)
    decisionForm.checklist.rightsChecked = Boolean(checklist.rightsChecked)
    decisionForm.checklist.allergensChecked = Boolean(checklist.allergensChecked)
  }
}

watch(filters, () => {
  void loadQueue()
})

onMounted(() => {
  void Promise.all([loadQueue(), loadDecisions()])
})
</script>

<template>
  <section class="admin-page">
    <AdminPageHeader
      eyebrow="COUR-104 · Modération"
      title="Modération communautaire"
      description="Contrôler les recettes proposées par la communauté, appliquer une décision motivée et conserver l’audit serveur."
    >
      <template #actions>
        <BaseButton type="button" variant="secondary" @click="isHistoryOpen = !isHistoryOpen">
          {{ isHistoryOpen ? 'Masquer historique' : 'Voir historique' }}
        </BaseButton>
        <BaseButton type="button" variant="secondary" @click="isCreateOpen = !isCreateOpen">
          {{ isCreateOpen ? 'Fermer ajout' : 'Nouvelle soumission' }}
        </BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadQueue">
          {{ isLoading ? 'Chargement…' : 'Rafraîchir' }}
        </BaseButton>
      </template>
    </AdminPageHeader>

    <div v-if="feedback || errorMessage" class="grid gap-2">
      <p
        v-if="feedback"
        class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success"
      >
        {{ feedback }}
      </p>
      <p
        v-if="errorMessage"
        class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger"
      >
        {{ errorMessage }}
      </p>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <article v-for="stat in moderationStats" :key="stat.label" class="admin-stat-card">
        <span>{{ stat.label }}</span>
        <strong>
          <BaseBadge :tone="stat.tone">{{ stat.value }}</BaseBadge>
        </strong>
        <small>{{ stat.detail }}</small>
      </article>
    </div>

    <section class="admin-toolbar grid gap-3 md:grid-cols-[1fr_1fr_auto]">
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Statut
        <select v-model="filters.status">
          <option value="">Tous statuts</option>
          <option value="pending">En attente</option>
          <option value="correction_requested">Correction demandée</option>
          <option value="accepted">Acceptée</option>
          <option value="rejected">Refusée</option>
          <option value="archived">Archivée</option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-coursia-text">
        Priorité
        <select v-model="filters.priority">
          <option value="">Toutes priorités</option>
          <option value="urgent">Urgente</option>
          <option value="high">Haute</option>
          <option value="normal">Normale</option>
          <option value="low">Basse</option>
        </select>
      </label>
      <label class="flex cursor-pointer items-end gap-3 rounded-2xl border border-coursia-border bg-coursia-surface-muted px-4 py-2.5 text-sm font-semibold text-coursia-text">
        <input v-model="filters.oldestFirst" type="checkbox" class="h-4 w-4 cursor-pointer accent-coursia-primary">
        Ancienneté d’abord
      </label>
    </section>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <AdminPanel
        title="File de soumissions"
        description="Sélectionne une ligne pour ouvrir le contrôle détaillé."
        :padded="false"
      >
        <template #actions>
          <BaseBadge tone="neutral">Audit serveur</BaseBadge>
        </template>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">Chargement de la file…</div>
        <AdminEmptyState
          v-else-if="submissions.length === 0"
          icon="moderation"
          title="Aucune soumission"
          description="Aucune soumission ne correspond aux filtres actuels."
        />
        <AdminTableShell v-else>
            <thead>
              <tr>
                <th class="text-left">Recette</th>
                <th class="text-left">Priorité</th>
                <th class="text-left">Statut</th>
                <th class="text-left">Ancienneté</th>
                <th class="text-left">Contrôle</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="submission in submissions"
                :key="String(submission.id)"
                class="cursor-pointer border-t border-coursia-border transition hover:bg-coursia-surface-muted"
                :class="selectedSubmissionId === String(submission.id) ? 'bg-coursia-primary/10' : ''"
                @click="selectSubmission(submission)"
              >
                <td>
                  <p class="max-w-[320px] truncate font-semibold text-coursia-text">{{ submission.title }}</p>
                  <p class="mt-1 truncate text-xs text-coursia-muted">Source {{ submission.source || '—' }}</p>
                </td>
                <td>
                  <BaseBadge :tone="priorityTone(submission.priority)">
                    {{ priorityLabels[String(submission.priority) as Priority] ?? submission.priority }}
                  </BaseBadge>
                </td>
                <td>
                  <BaseBadge :tone="statusTone(submission.status)">
                    {{ statusLabels[String(submission.status)] ?? submission.status }}
                  </BaseBadge>
                </td>
                <td class="text-sm text-coursia-muted">{{ formatSubmissionAge(submission) }}</td>
                <td class="text-sm text-coursia-muted">
                  {{ Array.isArray(submission.missingChecks) ? submission.missingChecks.length : '—' }} manquant(s)
                </td>
              </tr>
            </tbody>
        </AdminTableShell>
      </AdminPanel>

      <aside class="grid content-start gap-4">
        <article class="rounded-3xl border border-coursia-border bg-coursia-surface p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-coursia-primary">Décision</p>
              <h2 class="mt-1 text-xl font-semibold tracking-[-0.03em] text-coursia-text">
                {{ selectedSubmission?.title ?? 'Aucune soumission' }}
              </h2>
              <p class="mt-1 text-xs text-coursia-muted">{{ selectedSubmissionId || 'Sélection requise' }}</p>
            </div>
            <BaseBadge :tone="statusTone(selectedSubmission?.status)">
              {{ selectedStatusLabel }}
            </BaseBadge>
          </div>

          <div v-if="selectedSubmission" class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-semibold text-coursia-muted">Priorité</span>
              <p class="mt-1 text-base font-semibold text-coursia-text">{{ selectedPriorityLabel }}</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-semibold text-coursia-muted">Complétion</span>
              <p class="mt-1 text-base font-semibold text-coursia-text">{{ completionRatio }}%</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-semibold text-coursia-muted">Ingrédients</span>
              <p class="mt-1 text-base font-semibold text-coursia-text">{{ selectedRecipePreview.ingredients }}</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-semibold text-coursia-muted">Étapes</span>
              <p class="mt-1 text-base font-semibold text-coursia-text">{{ selectedRecipePreview.steps }}</p>
            </div>
          </div>

          <fieldset class="mt-5">
            <legend class="text-sm font-semibold text-coursia-text">Checklist de validation</legend>
            <div class="mt-2 grid gap-2">
              <label
                v-for="key in checklistKeys"
                :key="key"
                class="flex cursor-pointer items-start gap-3 rounded-xl border border-coursia-border bg-coursia-surface-muted px-3 py-2.5 text-xs text-coursia-muted transition hover:border-coursia-primary/40"
              >
                <input v-model="decisionForm.checklist[key]" type="checkbox" class="mt-0.5 h-4 w-4 cursor-pointer accent-coursia-primary">
                <span>
                  <span class="block font-semibold text-coursia-text">{{ checklistLabels[key] }}</span>
                  <span>{{ checklistDescriptions[key] }}</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div class="mt-3 rounded-2xl bg-coursia-surface-muted p-3 text-xs leading-5 text-coursia-muted">
            À valider maintenant :
            {{ missingChecks.map((key) => checklistLabels[key as ChecklistKey] ?? key).join(', ') || 'aucun point bloquant' }}.
            <br>
            Manquants enregistrés :
            {{ selectedMissingChecks.map((key) => checklistLabels[key as ChecklistKey] ?? key).join(', ') || 'aucun' }}.
          </div>

          <div v-if="selectedAllergens.length" class="mt-3 flex flex-wrap gap-2">
            <BaseBadge v-for="allergen in selectedAllergens" :key="allergen" tone="warning">{{ allergen }}</BaseBadge>
          </div>

          <label class="mt-4 grid gap-1.5 text-xs font-semibold text-coursia-text">
            Raison ou note interne
            <textarea v-model="decisionForm.reason" rows="4" placeholder="Motif du refus, correction attendue ou note de modération…" />
          </label>

          <div class="mt-4 grid gap-2">
            <BaseButton type="button" :disabled="!canAccept" @click="decide('accept')">
              {{ decisionLabels.accept }}
            </BaseButton>
            <div class="grid grid-cols-3 gap-2">
              <BaseButton type="button" variant="secondary" :disabled="isSaving || !selectedSubmissionId" @click="decide('request_correction')">
                Correction
              </BaseButton>
              <BaseButton type="button" variant="secondary" :disabled="!canReject" @click="decide('reject')">
                Refuser
              </BaseButton>
              <BaseButton type="button" variant="ghost" :disabled="isSaving || !selectedSubmissionId" @click="decide('archive')">
                Archiver
              </BaseButton>
            </div>
          </div>

          <p class="mt-3 text-xs leading-5 text-coursia-muted">
            {{ decisionHelp[decisionForm.decision] }}
          </p>
        </article>

        <form
          v-if="isCreateOpen"
          class="rounded-3xl border border-coursia-border bg-coursia-surface p-4"
          @submit.prevent="createSubmission"
        >
          <p class="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-coursia-primary">Ajout manuel</p>
          <h2 class="mt-1 text-lg font-semibold text-coursia-text">Soumission de test</h2>
          <p class="mt-1 text-xs text-coursia-muted">Pour tester le workflow sans attendre une contribution mobile.</p>

          <div class="mt-4 grid gap-3">
            <input v-model="submissionForm.title" required placeholder="Titre">
            <input v-model="submissionForm.source" required placeholder="Source">
            <input v-model="submissionForm.rights" required placeholder="Droits / licence">
            <select v-model="submissionForm.priority">
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div class="mt-4">
            <div class="flex gap-2">
              <input v-model="allergenInput" placeholder="Allergène" class="min-w-0 flex-1" @keyup.enter.prevent="addAllergen">
              <BaseButton type="button" size="sm" variant="secondary" @click="addAllergen">Ajouter</BaseButton>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="allergen in submissionForm.allergens"
                :key="allergen"
                type="button"
                class="cursor-pointer rounded-full bg-coursia-warning/10 px-3 py-1 text-xs font-semibold text-coursia-warning"
                @click="removeAllergen(allergen)"
              >
                {{ allergen }} ×
              </button>
            </div>
          </div>

          <BaseButton class="mt-5 w-full" type="submit" :disabled="isSaving">
            {{ isSaving ? 'Ajout…' : 'Ajouter à la file' }}
          </BaseButton>
        </form>
      </aside>
    </div>

    <AdminPanel
      v-if="isHistoryOpen"
      title="Décisions auditées"
      description="Historique récent des arbitrages de modération."
      :padded="false"
    >
      <template #actions>
        <BaseBadge tone="neutral">{{ decisions.length }}</BaseBadge>
      </template>

      <AdminEmptyState
        v-if="decisions.length === 0"
        icon="moderation"
        title="Aucune décision chargée"
        description="L’historique récent apparaîtra ici après une décision."
      />
      <AdminTableShell v-else>
          <thead>
            <tr>
              <th class="text-left">Décision</th>
              <th class="text-left">Soumission</th>
              <th class="text-left">Raison</th>
              <th class="text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="decision in decisions" :key="String(decision.id)" class="border-t border-coursia-border transition hover:bg-coursia-surface-muted">
              <td class="font-semibold text-coursia-text">{{ decision.decision }}</td>
              <td class="text-sm text-coursia-muted">{{ decision.submission_id || decision.submissionId }}</td>
              <td class="max-w-xl truncate text-sm text-coursia-muted">{{ decision.reason || '—' }}</td>
              <td class="text-sm text-coursia-muted">{{ formatDate(decision.decided_at ?? decision.created_at ?? decision.createdAt) }}</td>
            </tr>
          </tbody>
      </AdminTableShell>
    </AdminPanel>
  </section>
</template>
