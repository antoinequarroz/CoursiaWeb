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

const form = reactive({
  name: '',
  email: '',
  reason: publicEngagementContent.contactReasons[0] ?? 'Question produit',
  message: '',
  source: 'contact',
  consent: false,
  website: '',
  submittedAt: Date.now(),
})

const status = ref<'idle' | 'success' | 'error'>('idle')
const feedback = ref('')

const submitContact = async () => {
  status.value = 'idle'
  feedback.value = ''

  try {
    const response = await $fetch<{ message: string }>('/api/public/contact', {
      method: 'POST',
      body: form,
    })

    status.value = 'success'
    feedback.value = response.message
  } catch {
    status.value = 'error'
    feedback.value = 'Le message n’a pas pu être envoyé. Vos champs restent remplis.'
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[0.8fr_1.2fr]">
    <div>
      <BaseBadge tone="primary">Contact</BaseBadge>
      <h1 class="mt-5 text-5xl font-black">Parlez-nous de votre besoin.</h1>
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
        <label class="grid gap-2 text-sm font-bold">
          Nom
          <input v-model="form.name" required minlength="2" maxlength="80" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
        <label class="grid gap-2 text-sm font-bold">
          Email
          <input v-model="form.email" required type="email" maxlength="160" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
        </label>
      </div>

      <label class="mt-5 grid gap-2 text-sm font-bold">
        Sujet
        <select v-model="form.reason" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3">
          <option v-for="reason in publicEngagementContent.contactReasons" :key="reason">
            {{ reason }}
          </option>
        </select>
      </label>

      <label class="mt-5 grid gap-2 text-sm font-bold">
        Message
        <textarea v-model="form.message" required minlength="10" maxlength="2000" rows="6" class="rounded-coursia-md border border-coursia-border bg-coursia-background px-4 py-3" />
      </label>

      <input v-model="form.website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />

      <label class="mt-5 flex gap-3 text-sm leading-6 text-coursia-muted">
        <input v-model="form.consent" required type="checkbox" class="mt-1" />
        J’accepte que Coursia utilise ces informations pour répondre à ma demande.
      </label>

      <BaseButton class="mt-6">Envoyer le message</BaseButton>
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

