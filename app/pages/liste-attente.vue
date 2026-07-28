<script setup lang="ts">
definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Liste d’attente — Coursia',
  description:
    'Rejoignez la liste d’attente Coursia et donnez votre consentement pour être informé du lancement.',
  ogTitle: 'Liste d’attente Coursia',
  ogDescription: 'Inscription au lancement Coursia avec consentement et source enregistrés.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const form = reactive({
  email: '',
  source: 'landing',
  consent: false,
  householdSize: 2,
  interests: [] as string[],
  website: '',
  submittedAt: Date.now(),
})

const interestOptions = ['Recettes', 'Planning', 'Courses', 'Comparaison', 'Budget', 'Famille']
const status = ref<'idle' | 'success' | 'error'>('idle')
const feedback = ref('')
const isSubmitting = ref(false)

const submitWaitlist = async () => {
  status.value = 'idle'
  feedback.value = ''
  isSubmitting.value = true

  try {
    const response = await $fetch<{ message: string }>('/api/public/waitlist', {
      method: 'POST',
      body: form,
    })

    status.value = 'success'
    feedback.value = response.message
    form.submittedAt = Date.now()
  } catch (error) {
    status.value = 'error'
    feedback.value =
      error && typeof error === 'object' && 'statusMessage' in error
        ? String(error.statusMessage)
        : 'L’inscription n’a pas pu être enregistrée. Vos champs restent remplis.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-6xl gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
    <div>
      <BaseBadge tone="success">Liste d’attente</BaseBadge>
      <h1 class="mt-5 text-5xl font-black">Soyez prévenu du lancement.</h1>
      <p class="mt-5 text-lg leading-8 text-coursia-muted">
        L’inscription enregistre uniquement l’email, la source, le consentement et quelques
        préférences optionnelles pour préparer le lancement.
      </p>
      <NuxtLink to="/support" class="mt-5 inline-flex text-sm font-black text-coursia-primary">
        Demander l’accès, l’export ou la suppression →
      </NuxtLink>
    </div>

    <form
      class="rounded-[1.7rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
      @submit.prevent="submitWaitlist"
    >
      <label class="grid gap-2 text-sm font-bold">
        Email
        <input
          v-model="form.email"
          required
          type="email"
          maxlength="160"
          class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3"
        />
      </label>

      <label class="mt-5 grid gap-2 text-sm font-bold">
        Taille du foyer
        <input
          v-model.number="form.householdSize"
          type="number"
          min="1"
          max="12"
          class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3"
        />
      </label>

      <fieldset class="mt-5">
        <legend class="text-sm font-bold">Centres d’intérêt</legend>
        <div class="mt-3 grid gap-3 md:grid-cols-2">
          <label
            v-for="interest in interestOptions"
            :key="interest"
            class="flex cursor-pointer gap-3 text-sm text-coursia-muted"
          >
            <input v-model="form.interests" type="checkbox" :value="interest" />
            {{ interest }}
          </label>
        </div>
      </fieldset>

      <input
        v-model="form.website"
        tabindex="-1"
        autocomplete="off"
        class="hidden"
        aria-hidden="true"
      />

      <label class="mt-5 flex cursor-pointer gap-3 text-sm leading-6 text-coursia-muted">
        <input v-model="form.consent" required type="checkbox" class="mt-1" />
        J’accepte d’être contacté au sujet du lancement Coursia.
      </label>

      <BaseButton class="mt-6" :disabled="isSubmitting">
        {{ isSubmitting ? 'Enregistrement...' : 'Rejoindre la liste d’attente' }}
      </BaseButton>
      <p
        v-if="feedback"
        class="mt-5 rounded-2xl p-4 text-sm"
        :class="
          status === 'success'
            ? 'bg-coursia-success/10 text-coursia-success'
            : 'bg-coursia-danger/10 text-coursia-danger'
        "
      >
        {{ feedback }}
      </p>
    </form>
  </section>
</template>
