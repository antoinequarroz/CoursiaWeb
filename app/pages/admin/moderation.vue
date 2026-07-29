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

const checklistLabels: Record<ChecklistKey, string> = {
  recipeChecked: 'Recette',
  photoChecked: 'Photo',
  sourceChecked: 'Source',
  rightsChecked: 'Droits',
  allergensChecked: 'Allergènes',
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

const missingChecks = computed(() => getCommunitySubmissionMissingChecks(decisionForm.checklist))
const selectedSubmission = computed(() =>
  submissions.value.find((submission) => String(submission.id) === selectedSubmissionId.value) ?? null,
)
const urgentCount = computed(() =>
  submissions.value.filter((submission) => submission.priority === 'urgent' || submission.priority === 'high').length,
)
const pendingCount = computed(() =>
  submissions.value.filter((submission) => submission.status === 'pending').length,
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

const priorityTone = (priority: unknown): BadgeTone => {
  if (priority === 'urgent') return 'danger'
  if (priority === 'high') return 'warning'
  if (priority === 'normal') return 'primary'
  return 'neutral'
}

const statusTone = (status: unknown): BadgeTone => {
  if (status === 'accepted') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'correction_requested') return 'warning'
  if (status === 'archived') return 'neutral'
  return 'primary'
}

const formatDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) return '—'

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatSubmissionAge = (submission: SubmissionRecord) => {
  const age = submission.ageDays

  return typeof age === 'number' ? `${age} j` : '—'
}

const loadQueue = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: SubmissionRecord[] }>('/api/admin/community-moderation', {
      query: filters,
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

const loadDecisions = async () => {
  try {
    const response = await $fetch<{ data: DecisionRecord[] }>('/api/admin/community-moderation/decisions')
    decisions.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les décisions.'
  }
}

const resetSubmissionForm = () => {
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

const createSubmission = async () => {
  isSaving.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    await $fetch('/api/admin/community-moderation', {
      method: 'POST',
      body: submissionForm,
    })
    feedback.value = 'Soumission ajoutée dans la file.'
    resetSubmissionForm()
    await loadQueue()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’ajouter la soumission.'
  } finally {
    isSaving.value = false
  }
}

const decide = async (decision: Decision) => {
  decisionForm.decision = decision
  feedback.value = ''
  errorMessage.value = ''

  if (!selectedSubmissionId.value) {
    errorMessage.value = 'Sélectionne une soumission avant de décider.'
    return
  }

  isSaving.value = true

  try {
    await $fetch(`/api/admin/community-moderation/${selectedSubmissionId.value}/decision`, {
      method: 'POST',
      body: decisionForm,
    })

    feedback.value = decision === 'reject'
      ? 'Refus enregistré avec raison obligatoire et décision auditée.'
      : 'Décision de modération enregistrée et auditée.'
    await Promise.all([loadQueue(), loadDecisions()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d’enregistrer la décision.'
  } finally {
    isSaving.value = false
  }
}

const addAllergen = () => {
  const value = allergenInput.value.trim()

  if (value && !submissionForm.allergens.includes(value)) {
    submissionForm.allergens.push(value)
    allergenInput.value = ''
  }
}

const removeAllergen = (allergen: string) => {
  submissionForm.allergens = submissionForm.allergens.filter((item) => item !== allergen)
}

const selectSubmission = (submission: SubmissionRecord) => {
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
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-primary">COUR-104</p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
          Modération communautaire
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Vérifie recette, photo, source, droits et allergènes avant d’accepter, refuser ou demander une correction.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="loadDecisions">Historique</BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadQueue">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <p v-if="feedback" class="rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm font-semibold text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm font-semibold text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="grid gap-3 md:grid-cols-4">
      <article class="admin-stat-card">
        <span>Soumissions</span>
        <strong>{{ submissions.length }}</strong>
        <small>dans la file filtrée</small>
      </article>
      <article class="admin-stat-card">
        <span>En attente</span>
        <strong class="text-coursia-primary">{{ pendingCount }}</strong>
        <small>à traiter</small>
      </article>
      <article class="admin-stat-card">
        <span>Prioritaires</span>
        <strong class="text-coursia-warning">{{ urgentCount }}</strong>
        <small>haute ou urgente</small>
      </article>
      <article class="admin-stat-card">
        <span>Décisions</span>
        <strong>{{ decisions.length }}</strong>
        <small>auditées</small>
      </article>
    </div>

    <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
      <div class="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
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
        <label class="grid gap-1 text-sm font-bold text-coursia-foreground">
          Priorité
          <select v-model="filters.priority">
            <option value="">Toutes priorités</option>
            <option value="urgent">Urgente</option>
            <option value="high">Haute</option>
            <option value="normal">Normale</option>
            <option value="low">Basse</option>
          </select>
        </label>
        <label class="flex cursor-pointer items-end gap-3 rounded-xl border border-coursia-border bg-coursia-surface-muted px-4 py-2.5 text-sm font-semibold text-coursia-muted">
          <input v-model="filters.oldestFirst" type="checkbox" class="h-4 w-4 accent-coursia-primary">
          Ancienneté d’abord
        </label>
      </div>
    </section>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
      <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-4 py-3">
          <div>
            <h2 class="text-base font-black text-coursia-foreground">File de soumissions</h2>
            <p class="mt-1 text-xs text-coursia-muted">Sélectionne une ligne pour contrôler et décider.</p>
          </div>
          <BaseBadge tone="neutral">Audit actif</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-coursia-muted">Chargement de la file...</div>
        <div v-else-if="submissions.length === 0" class="p-5 text-sm text-coursia-muted">
          Aucune soumission pour ces filtres.
        </div>
        <div v-else class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th class="text-left">Recette</th>
                <th class="text-left">Priorité</th>
                <th class="text-left">Statut</th>
                <th class="text-left">Ancienneté</th>
                <th class="text-left">Conformité</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="submission in submissions"
                :key="String(submission.id)"
                class="cursor-pointer border-t border-coursia-border transition hover:bg-coursia-surface-muted"
                :class="selectedSubmissionId === String(submission.id) ? 'bg-coursia-primary/5' : ''"
                @click="selectSubmission(submission)"
              >
                <td>
                  <p class="font-black text-coursia-foreground">{{ submission.title }}</p>
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
          </table>
        </div>
      </section>

      <aside class="grid gap-4 content-start">
        <article class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Décision</p>
              <h2 class="mt-1 text-xl font-black tracking-tight text-coursia-foreground">
                {{ selectedSubmission?.title ?? 'Aucune soumission' }}
              </h2>
              <p class="mt-1 text-xs text-coursia-muted">{{ selectedSubmissionId || 'Sélection requise' }}</p>
            </div>
            <BaseBadge :tone="statusTone(selectedSubmission?.status)">
              {{ statusLabels[String(selectedSubmission?.status ?? 'pending')] ?? 'En attente' }}
            </BaseBadge>
          </div>

          <div v-if="selectedSubmission" class="mt-4 grid grid-cols-2 gap-3">
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-bold text-coursia-muted">Portions</span>
              <p class="mt-1 text-lg font-black text-coursia-foreground">{{ selectedRecipePreview.portions }}</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-bold text-coursia-muted">Durée</span>
              <p class="mt-1 text-lg font-black text-coursia-foreground">{{ selectedRecipePreview.duration }}</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-bold text-coursia-muted">Ingrédients</span>
              <p class="mt-1 text-lg font-black text-coursia-foreground">{{ selectedRecipePreview.ingredients }}</p>
            </div>
            <div class="rounded-2xl bg-coursia-surface-muted p-3">
              <span class="text-xs font-bold text-coursia-muted">Étapes</span>
              <p class="mt-1 text-lg font-black text-coursia-foreground">{{ selectedRecipePreview.steps }}</p>
            </div>
          </div>

          <fieldset class="mt-5">
            <legend class="text-sm font-black text-coursia-foreground">Checklist de validation</legend>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label
                v-for="key in checklistKeys"
                :key="key"
                class="flex cursor-pointer items-center gap-2 rounded-xl border border-coursia-border bg-coursia-surface-muted px-3 py-2 text-xs font-semibold text-coursia-muted"
              >
                <input v-model="decisionForm.checklist[key]" type="checkbox" class="h-4 w-4 accent-coursia-primary">
                {{ checklistLabels[key] }}
              </label>
            </div>
          </fieldset>

          <div class="mt-3 rounded-2xl bg-coursia-surface-muted p-3 text-xs leading-5 text-coursia-muted">
            Checks manquants sélection : {{ missingChecks.map((key) => checklistLabels[key as ChecklistKey] ?? key).join(', ') || 'aucun' }}.
            <br>
            Checks manquants en base : {{ selectedMissingChecks.map((key) => checklistLabels[key as ChecklistKey] ?? key).join(', ') || 'aucun' }}.
          </div>

          <div v-if="selectedAllergens.length" class="mt-3 flex flex-wrap gap-2">
            <BaseBadge v-for="allergen in selectedAllergens" :key="allergen" tone="warning">{{ allergen }}</BaseBadge>
          </div>

          <label class="mt-4 grid gap-1 text-sm font-bold text-coursia-foreground">
            Raison — obligatoire pour le refus
            <textarea v-model="decisionForm.reason" rows="4" placeholder="Motif, correction demandée ou note interne..." />
          </label>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <BaseButton type="button" :disabled="isSaving || !selectedSubmissionId" @click="decide('accept')">
              {{ decisionLabels.accept }}
            </BaseButton>
            <BaseButton type="button" variant="secondary" :disabled="isSaving || !selectedSubmissionId" @click="decide('request_correction')">
              {{ decisionLabels.request_correction }}
            </BaseButton>
            <BaseButton type="button" variant="secondary" :disabled="isSaving || !selectedSubmissionId" @click="decide('reject')">
              {{ decisionLabels.reject }}
            </BaseButton>
            <BaseButton type="button" variant="ghost" :disabled="isSaving || !selectedSubmissionId" @click="decide('archive')">
              {{ decisionLabels.archive }}
            </BaseButton>
          </div>
        </article>

        <form class="rounded-2xl border border-coursia-border bg-coursia-surface p-4 shadow-coursia-sm" @submit.prevent="createSubmission">
          <p class="text-xs font-black uppercase tracking-[0.16em] text-coursia-primary">Ajout manuel</p>
          <h2 class="mt-1 text-lg font-black text-coursia-foreground">Soumission de test</h2>
          <p class="mt-1 text-xs text-coursia-muted">Utile pour tester le workflow sans attendre une contribution mobile.</p>

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
            {{ isSaving ? 'Ajout...' : 'Ajouter à la file' }}
          </BaseButton>
        </form>
      </aside>
    </div>

    <section class="admin-table overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-4 py-3">
        <div>
          <h2 class="text-base font-black text-coursia-foreground">Décisions auditées</h2>
          <p class="mt-1 text-xs text-coursia-muted">Historique récent des arbitrages de modération.</p>
        </div>
        <BaseBadge tone="neutral">{{ decisions.length }}</BaseBadge>
      </div>

      <div v-if="decisions.length === 0" class="p-5 text-sm text-coursia-muted">Aucune décision chargée.</div>
      <div v-else class="overflow-x-auto">
        <table>
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
              <td class="font-black text-coursia-foreground">{{ decision.decision }}</td>
              <td class="text-sm text-coursia-muted">{{ decision.submission_id || decision.submissionId }}</td>
              <td class="text-sm text-coursia-muted">{{ decision.reason || '—' }}</td>
              <td class="text-sm text-coursia-muted">{{ formatDate(decision.decided_at ?? decision.created_at ?? decision.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
