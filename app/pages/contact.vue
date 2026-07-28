<script setup lang="ts">
import { publicEngagementContent } from '#shared/public-site/engagement-content'

definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Contact — Coursia',
  description:
    'Contactez Coursia pour une question produit, un partenariat, le support ou une demande liée aux données.',
  ogTitle: 'Contact Coursia',
  ogDescription: 'Une demande, une question ou un besoin de support ? Contactez Coursia.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const createInitialForm = () => ({
  name: '',
  email: '',
  reason: publicEngagementContent.contactReasons[0] ?? 'Question produit',
  message: '',
  source: 'contact',
  consent: false,
  website: '',
  submittedAt: Date.now(),
})

const form = reactive(createInitialForm())
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const feedback = ref('')

const resetForm = () => {
  Object.assign(form, createInitialForm())
}

const submitContact = async () => {
  if (status.value === 'loading') {
    return
  }

  status.value = 'loading'
  feedback.value = ''

  try {
    const response = await $fetch<{ message: string }>('/api/public/contact', {
      method: 'POST',
      body: form,
    })

    status.value = 'success'
    feedback.value = response.message
    resetForm()
  } catch (error: unknown) {
    status.value = 'error'
    feedback.value =
      error && typeof error === 'object' && 'statusMessage' in error && typeof error.statusMessage === 'string'
        ? error.statusMessage
        : 'Le message n’a pas pu être envoyé. Vos champs restent remplis.'
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[0.8fr_1.2fr]">
    <div>
      <BaseBadge tone="primary">Contact</BaseBadge>
      <h1 class="mt-5 max-w-xl text-5xl font-black tracking-tight text-coursia-text">
        Parlez-nous de votre besoin.
      </h1>
      <p class="mt-5 text-lg leading-8 text-coursia-muted">
        Le formulaire minimise les données, valide les champs et protège contre l’abus avec un champ
        invisible et un contrôle de soumission.
      </p>
      <p class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm leading-6 text-coursia-muted">
        {{ publicEngagementContent.privacyNotice }}
      </p>
    </div>

    <form
      class="rounded-[1.7rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
      @submit.prevent="submitContact"
    >
      <div class="grid gap-5 md:grid-cols-2">
        <label class="grid gap-2 text-sm font-bold text-coursia-text">
          Nom
          <input
            v-model="form.name"
            required
            minlength="2"
            maxlength="80"
            autocomplete="name"
            class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-text outline-none transition focus:border-coursia-primary"
          />
        </label>
        <label class="grid gap-2 text-sm font-bold text-coursia-text">
          Email
          <input
            v-model="form.email"
            required
            type="email"
            maxlength="160"
            autocomplete="email"
            class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-text outline-none transition focus:border-coursia-primary"
          />
        </label>
      </div>

      <label class="mt-5 grid gap-2 text-sm font-bold text-coursia-text">
        Sujet
        <select
          v-model="form.reason"
          class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-text outline-none transition focus:border-coursia-primary"
        >
          <option v-for="reason in publicEngagementContent.contactReasons" :key="reason">
            {{ reason }}
          </option>
        </select>
      </label>

      <label class="mt-5 grid gap-2 text-sm font-bold text-coursia-text">
        Message
        <textarea
          v-model="form.message"
          required
          minlength="10"
          maxlength="2000"
          rows="6"
          class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3 text-coursia-text outline-none transition focus:border-coursia-primary"
        />
      </label>

      <input v-model="form.website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />

      <label class="mt-5 flex gap-3 text-sm leading-6 text-coursia-muted">
        <input v-model="form.consent" required type="checkbox" class="mt-1 accent-coursia-primary" />
        J’accepte que Coursia utilise ces informations pour répondre à ma demande.
      </label>

      <BaseButton class="mt-6" :disabled="status === 'loading'">
        {{ status === 'loading' ? 'Envoi en cours…' : 'Envoyer le message' }}
      </BaseButton>

      <p
        v-if="feedback"
        class="mt-5 rounded-2xl p-4 text-sm"
        :class="status === 'success' ? 'bg-coursia-success/10 text-coursia-success' : 'bg-coursia-danger/10 text-coursia-danger'"
      >
        {{ feedback }}
      </p>
    </form>
  </section>
</template>
