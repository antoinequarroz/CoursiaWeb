<script setup lang="ts">
import {
  getCommunitySubmissionMissingChecks,
  type CommunityModerationDecisionInput,
  type CommunitySubmissionInput,
} from '#shared/validation/community-moderation'

definePageMeta({
  layout: 'admin',
})

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

const submissions = ref<Array<Record<string, unknown>>>([])
const decisions = ref<Array<Record<string, unknown>>>([])
const selectedSubmissionId = ref('')
const feedback = ref('')
const allergenInput = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const isSaving = ref(false)

const missingChecks = computed(() => getCommunitySubmissionMissingChecks(decisionForm.checklist))

const loadQueue = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/community-moderation', {
      query: filters,
    })
    submissions.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger la file de moderation.'
  } finally {
    isLoading.value = false
  }
}

const loadDecisions = async () => {
  try {
    const response = await $fetch<{ data: Array<Record<string, unknown>> }>('/api/admin/community-moderation/decisions')
    decisions.value = response.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible de charger les decisions.'
  }
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
    feedback.value = 'Soumission ajoutee dans la file avec priorite et anciennete.'
    await loadQueue()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d ajouter la soumission.'
  } finally {
    isSaving.value = false
  }
}

const decide = async (decision: CommunityModerationDecisionInput['decision']) => {
  decisionForm.decision = decision
  feedback.value = ''
  errorMessage.value = ''

  if (!selectedSubmissionId.value) {
    feedback.value = 'Selectionne une soumission avant de decider.'
    return
  }

  isSaving.value = true

  try {
    await $fetch(`/api/admin/community-moderation/${selectedSubmissionId.value}/decision`, {
      method: 'POST',
      body: decisionForm,
    })

    feedback.value = decision === 'reject'
      ? 'Refus enregistre avec raison obligatoire et decision auditee.'
      : 'Decision de moderation enregistree et auditee.'
    await Promise.all([loadQueue(), loadDecisions()])
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Impossible d enregistrer la decision.'
  } finally {
    isSaving.value = false
  }
}

const addAllergen = () => {
  if (allergenInput.value.trim()) {
    submissionForm.allergens.push(allergenInput.value.trim())
    allergenInput.value = ''
  }
}

const selectSubmission = (submission: Record<string, unknown>) => {
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
  <section>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm font-black uppercase tracking-[0.24em] text-coursia-primary">COUR-104</p>
        <h1 class="mt-2 text-3xl font-black">File de moderation communautaire</h1>
        <p class="mt-3 max-w-3xl text-coursia-muted">
          Validation controlee des futures contributions : recette, photo, source, droits,
          allergenes, priorite, anciennete et decisions auditees.
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton type="button" variant="secondary" @click="loadDecisions">Decisions</BaseButton>
        <BaseButton type="button" @click="loadQueue">Rafraichir</BaseButton>
      </div>
    </div>

    <div class="mt-8 grid gap-4 rounded-[1.4rem] bg-coursia-surface p-5 md:grid-cols-3">
      <select v-model="filters.status" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Tous statuts</option>
        <option value="pending">En attente</option>
        <option value="correction_requested">Correction demandee</option>
        <option value="accepted">Acceptee</option>
        <option value="rejected">Refusee</option>
        <option value="archived">Archivee</option>
      </select>
      <select v-model="filters.priority" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
        <option value="">Toutes priorites</option>
        <option value="urgent">Urgente</option>
        <option value="high">Haute</option>
        <option value="normal">Normale</option>
        <option value="low">Basse</option>
      </select>
      <label class="flex items-center gap-3 rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 text-sm font-bold">
        <input v-model="filters.oldestFirst" type="checkbox" />
        Anciennete d abord
      </label>
    </div>

    <p v-if="feedback" class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm">{{ feedback }}</p>
    <p v-if="errorMessage" class="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{{ errorMessage }}</p>

    <section class="mt-8 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
        <h2 class="text-2xl font-black">Soumissions</h2>
        <p v-if="isLoading" class="mt-5 text-sm text-coursia-muted">Chargement de la file...</p>
        <p v-else-if="submissions.length === 0" class="mt-5 text-sm text-coursia-muted">Aucune soumission pour ces filtres.</p>
        <div class="mt-5 grid gap-4">
          <button
            v-for="submission in submissions"
            :key="String(submission.id)"
            type="button"
            class="rounded-2xl border border-coursia-border bg-coursia-background p-4 text-left"
            @click="selectSubmission(submission)"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-black">{{ submission.title }}</h3>
              <span class="rounded-full bg-coursia-surface-muted px-3 py-1 text-xs font-black">
                {{ submission.priority }} - {{ submission.status }}
              </span>
            </div>
            <p class="mt-2 text-sm text-coursia-muted">
              Anciennete {{ submission.ageDays }} jours - manquants {{ submission.missingChecks }}
            </p>
            <p class="mt-2 text-xs text-coursia-muted">
              Source {{ submission.source }} - droits {{ submission.rights }} - allergenes {{ submission.allergens }}
            </p>
          </button>
        </div>
      </article>

      <section class="grid gap-5">
        <form class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5" @submit.prevent="createSubmission">
          <h2 class="text-2xl font-black">Ajouter une soumission</h2>
          <label class="mt-5 grid gap-2 text-sm font-bold">
            Titre
            <input v-model="submissionForm.title" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="mt-4 grid gap-2 text-sm font-bold">
            Source
            <input v-model="submissionForm.source" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="mt-4 grid gap-2 text-sm font-bold">
            Droits
            <input v-model="submissionForm.rights" required class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <label class="mt-4 grid gap-2 text-sm font-bold">
            Priorite
            <select v-model="submissionForm.priority" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </label>
          <div class="mt-4">
            <label class="grid gap-2 text-sm font-bold">
              Allergene
              <input v-model="allergenInput" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
            </label>
            <BaseButton class="mt-2" type="button" size="sm" variant="secondary" @click="addAllergen">Ajouter</BaseButton>
          </div>
          <BaseButton class="mt-6" type="submit" :disabled="isSaving">
            {{ isSaving ? 'Ajout...' : 'Ajouter a la file' }}
          </BaseButton>
        </form>

        <article class="rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
          <h2 class="text-2xl font-black">Decision moderateur</h2>
          <label class="mt-5 grid gap-2 text-sm font-bold">
            ID selectionne
            <input v-model="selectedSubmissionId" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <fieldset class="mt-5">
            <legend class="text-sm font-bold">Verification recette, photo, source, droits et allergenes</legend>
            <div class="mt-3 grid gap-2 text-sm text-coursia-muted">
              <label><input v-model="decisionForm.checklist.recipeChecked" type="checkbox" /> Recette verifiee</label>
              <label><input v-model="decisionForm.checklist.photoChecked" type="checkbox" /> Photo verifiee</label>
              <label><input v-model="decisionForm.checklist.sourceChecked" type="checkbox" /> Source verifiee</label>
              <label><input v-model="decisionForm.checklist.rightsChecked" type="checkbox" /> Droits verifies</label>
              <label><input v-model="decisionForm.checklist.allergensChecked" type="checkbox" /> Allergenes verifies</label>
            </div>
          </fieldset>
          <p class="mt-3 text-sm text-coursia-muted">Checks manquants : {{ missingChecks.join(', ') || 'aucun' }}</p>
          <label class="mt-4 grid gap-2 text-sm font-bold">
            Raison - obligatoire pour le refus
            <textarea v-model="decisionForm.reason" rows="4" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
          </label>
          <div class="mt-5 flex flex-wrap gap-2">
            <BaseButton type="button" :disabled="isSaving" @click="decide('accept')">Accepter</BaseButton>
            <BaseButton type="button" :disabled="isSaving" variant="secondary" @click="decide('request_correction')">Demander correction</BaseButton>
            <BaseButton type="button" :disabled="isSaving" variant="secondary" @click="decide('reject')">Refuser</BaseButton>
            <BaseButton type="button" :disabled="isSaving" variant="ghost" @click="decide('archive')">Archiver</BaseButton>
          </div>
        </article>
      </section>
    </section>

    <section class="mt-8 rounded-[1.4rem] border border-coursia-border bg-coursia-surface p-5">
      <h2 class="text-xl font-black">Decisions auditees</h2>
      <div class="mt-4 grid gap-3">
        <div v-for="decision in decisions" :key="String(decision.id)" class="rounded-2xl bg-coursia-background p-4 text-sm">
          {{ decision.decision }} - soumission {{ decision.submission_id }} - raison {{ decision.reason || '-' }}
        </div>
      </div>
      <p class="mt-5 text-sm text-coursia-muted">
        Coordination fonctionnelle maintenue avec COUR-29, COUR-30 et COUR-72 : la file reste separee
        du backend communautaire final et audite les decisions avant branchement complet.
      </p>
    </section>
  </section>
</template>
