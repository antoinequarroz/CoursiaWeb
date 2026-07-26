<script setup lang="ts">
import { publicLegalContent } from '#shared/public-site/legal-content'

definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Support et données — Coursia',
  description:
    'Support Coursia pour les demandes de contact, accès, export, suppression et retrait du consentement.',
  ogTitle: 'Support Coursia',
  ogDescription: 'Demandes d’accès, export et suppression des données Coursia.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <section class="mx-auto max-w-5xl py-10">
    <BaseBadge tone="primary">Support</BaseBadge>
    <h1 class="mt-5 text-5xl font-black">Accès, export et suppression.</h1>
    <p class="mt-5 max-w-3xl text-lg leading-8 text-coursia-muted">
      Contact : {{ publicLegalContent.contactEmail }}. Indiquez l’email concerné et le type de
      demande pour permettre le traitement sans collecter de données inutiles.
    </p>

    <div class="mt-10 grid gap-5 md:grid-cols-2">
      <article
        v-for="right in publicLegalContent.dataRights"
        :key="right"
        class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
      >
        <h2 class="text-xl font-black">{{ right }}</h2>
      </article>
    </div>

    <NuxtLink to="/contact" class="mt-8 inline-flex rounded-full bg-coursia-primary px-6 py-3 text-sm font-black text-white">
      Contacter le support
    </NuxtLink>
  </section>
</template>

