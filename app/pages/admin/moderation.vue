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

const missingChecks = computed(() => getCommunitySubmissionMissingChecks(decisionForm.checklist))
const selectedSubmission = computed(() =>
  submissions.value.find((submission) => String(submission.id) === selectedSubmissionId.value) ?? null,
)
const urgentCount = computed(() =>
  submissions.value.filter((submission) => submission.priority === 'urgent' || submission.priority === 'high').length,
)

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

const checklistLabels: Record<keyof CommunityModerationDecisionInput['checklist'], string> = {
  recipeChecked: 'Recette',
  photoChecked: 'Photo',
  sourceChecked: 'Source',
  rightsChecked: 'Droits',
  allergensChecked: 'Allergènes',
}

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

const decisionLabel = (decision: Decision) => {
  const labels: Record<Decision, string> = {
    accept: 'Accepter',
    reject: 'Refuser',
    request_correction: 'Demander correction',
    archive: 'Archiver',
  }

  return labels[decision]
}

const loadQueue = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: SubmissionRecord[] }>('/api/admin/community-moderation', {
      query: filters,
    })
    submissions.value = response.data
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
    feedback.value = 'Soumission ajoutée dans la file avec priorité et ancienneté.'
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

    feedback.value =
      decision === 'reject'
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
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-104</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
          File de modération communautaire
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-[#667085]">
          Vérifie recette, photo, source, droits et allergènes avant toute décision sur les
          contributions futures.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton type="button" variant="secondary" @click="loadDecisions">Décisions</BaseButton>
        <BaseButton type="button" :disabled="isLoading" @click="loadQueue">
          {{ isLoading ? 'Chargement...' : 'Rafraîchir' }}
        </BaseButton>
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-4">
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Soumissions</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ submissions.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">dans la file filtrée</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Prioritaires</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ urgentCount }}</p>
        <p class="mt-1 text-xs text-[#667085]">haute ou urgente</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Checks manquants</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ missingChecks.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">sur la sélection</p>
      </article>
      <article class="admin-stat-card rounded-2xl border border-[#e6e1d8] bg-white p-5">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#667085]">Décisions</p>
        <p class="mt-3 text-3xl font-semibold text-[#101828]">{{ decisions.length }}</p>
        <p class="mt-1 text-xs text-[#667085]">auditées</p>
      </article>
    </div>

    <div class="admin-toolbar mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
      <select v-model="filters.status" class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
        <option value="">Tous statuts</option>
        <option value="pending">En attente</option>
        <option value="correction_requested">Correction demandée</option>
        <option value="accepted">Acceptée</option>
        <option value="rejected">Refusée</option>
        <option value="archived">Archivée</option>
      </select>
      <select v-model="filters.priority" class="rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
        <option value="">Toutes priorités</option>
        <option value="urgent">Urgente</option>
        <option value="high">Haute</option>
        <option value="normal">Normale</option>
        <option value="low">Basse</option>
      </select>
      <label class="flex items-center gap-3 rounded-xl border border-[#e6e1d8] bg-white px-4 py-2.5 text-sm text-[#344054]">
        <input v-model="filters.oldestFirst" type="checkbox">
        Ancienneté d’abord
      </label>
    </div>

    <p v-if="feedback" class="mt-4 rounded-2xl border border-coursia-success/20 bg-coursia-success/10 p-3 text-sm text-coursia-success">
      {{ feedback }}
    </p>
    <p v-if="errorMessage" class="mt-4 rounded-2xl border border-coursia-danger/20 bg-coursia-danger/10 p-3 text-sm text-coursia-danger">
      {{ errorMessage }}
    </p>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section class="admin-table overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
        <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
          <div>
            <h2 class="text-sm font-semibold text-[#101828]">Soumissions</h2>
            <p class="mt-1 text-xs text-[#667085]">Sélectionne une ligne pour décider.</p>
          </div>
          <BaseBadge tone="neutral">Audit actif</BaseBadge>
        </div>

        <div v-if="isLoading" class="p-5 text-sm text-[#667085]">Chargement de la file...</div>
        <div v-else-if="submissions.length === 0" class="p-5 text-sm text-[#667085]">
          Aucune soumission pour ces filtres.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-[#eee8df] text-sm">
            <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
              <tr>
                <th class="px-5 py-3">Recette</th>
                <th class="px-5 py-3">Priorité</th>
                <th class="px-5 py-3">Statut</th>
                <th class="px-5 py-3">Ancienneté</th>
                <th class="px-5 py-3">Conformité</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#eee8df]">
              <tr
                v-for="submission in submissions"
                :key="String(submission.id)"
                class="cursor-pointer transition hover:bg-[#fbfaf7]"
                :class="selectedSubmissionId === String(submission.id) ? 'bg-[#f1f7f4]' : ''"
                @click="selectSubmission(submission)"
              >
                <td class="px-5 py-4">
                  <span class="block font-semibold text-[#101828]">{{ submission.title }}</span>
                  <span class="mt-1 block text-xs text-[#667085]">Source {{ submission.source || '—' }}</span>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="priorityTone(submission.priority)">
                    {{ priorityLabels[String(submission.priority) as Priority] ?? submission.priority }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4">
                  <BaseBadge :tone="statusTone(submission.status)">
                    {{ statusLabels[String(submission.status)] ?? submission.status }}
                  </BaseBadge>
                </td>
                <td class="px-5 py-4 text-[#667085]">{{ submission.ageDays ?? '—' }} j</td>
                <td class="px-5 py-4 text-[#667085]">{{ submission.missingChecks ?? '—' }} manquant(s)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="grid gap-5">
        <article class="rounded-2xl border border-[#e6e1d8] bg-white p-5 shadow-[0_16px_40px_rgba(15,45,39,0.06)]">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Décision</p>
          <h2 class="mt-2 text-lg font-semibold text-[#101828]">
            {{ selectedSubmission?.title ?? 'Aucune soumission sélectionnée' }}
          </h2>

          <label class="mt-5 grid gap-1.5 text-xs font-semibold text-[#344054]">
            ID sélectionné
            <input v-model="selectedSubmissionId" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
          </label>

          <fieldset class="mt-5">
            <legend class="text-xs font-semibold text-[#344054]">Checklist de validation</legend>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <label
                v-for="(label, key) in checklistLabels"
                :key="key"
                class="flex items-center gap-2 rounded-xl border border-[#e6e1d8] px-3 py-2 text-xs text-[#667085]"
              >
                <input v-model="decisionForm.checklist[key]" type="checkbox">
                {{ label }}
              </label>
            </div>
          </fieldset>

          <p class="mt-3 text-xs text-[#667085]">
            Checks manquants : {{ missingChecks.join(', ') || 'aucun' }}.
          </p>

          <label class="mt-4 grid gap-1.5 text-xs font-semibold text-[#344054]">
            Raison — obligatoire pour le refus
            <textarea v-model="decisionForm.reason" rows="4" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary" />
          </label>

          <div class="mt-5 grid grid-cols-2 gap-2">
            <BaseButton
              v-for="decision in ['accept', 'request_correction', 'reject', 'archive']"
              :key="decision"
              type="button"
              :variant="decision === 'accept' ? 'primary' : 'secondary'"
              :disabled="isSaving"
              @click="decide(decision as Decision)"
            >
              {{ decisionLabel(decision as Decision) }}
            </BaseButton>
          </div>
        </article>

        <form class="rounded-2xl border border-[#e6e1d8] bg-white p-5" @submit.prevent="createSubmission">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Ajout manuel</p>
          <h2 class="mt-2 text-lg font-semibold text-[#101828]">Soumission de test</h2>
          <div class="mt-5 grid gap-3">
            <input v-model="submissionForm.title" required placeholder="Titre" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            <input v-model="submissionForm.source" required placeholder="Source" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            <input v-model="submissionForm.rights" required placeholder="Droits" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
            <select v-model="submissionForm.priority" class="rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary">
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div class="mt-4">
            <div class="flex gap-2">
              <input v-model="allergenInput" placeholder="Allergène" class="min-w-0 flex-1 rounded-xl border border-[#e6e1d8] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-coursia-primary" @keyup.enter.prevent="addAllergen">
              <BaseButton type="button" size="sm" variant="secondary" @click="addAllergen">Ajouter</BaseButton>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <button v-for="allergen in submissionForm.allergens" :key="allergen" type="button" class="rounded-full bg-[#fff2e8] px-3 py-1 text-xs text-[#7a4b2b]" @click="removeAllergen(allergen)">
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

    <section class="admin-table mt-6 overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
      <div class="flex items-center justify-between border-b border-[#eee8df] px-5 py-4">
        <div>
          <h2 class="text-sm font-semibold text-[#101828]">Décisions auditées</h2>
          <p class="mt-1 text-xs text-[#667085]">Historique récent des arbitrages de modération.</p>
        </div>
        <BaseBadge tone="neutral">{{ decisions.length }}</BaseBadge>
      </div>
      <div v-if="decisions.length === 0" class="p-5 text-sm text-[#667085]">Aucune décision chargée.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[#eee8df] text-sm">
          <thead class="bg-[#fbfaf7] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#667085]">
            <tr>
              <th class="px-5 py-3">Décision</th>
              <th class="px-5 py-3">Soumission</th>
              <th class="px-5 py-3">Raison</th>
              <th class="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#eee8df]">
            <tr v-for="decision in decisions" :key="String(decision.id)" class="transition hover:bg-[#fbfaf7]">
              <td class="px-5 py-4 font-medium text-[#101828]">{{ decision.decision }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ decision.submission_id || decision.submissionId }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ decision.reason || '—' }}</td>
              <td class="px-5 py-4 text-[#667085]">{{ decision.created_at || decision.createdAt || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
