<script setup lang="ts">
import { publicLegalContent } from '#shared/public-site/legal-content'

definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'Informations légales — Coursia',
  description:
    'Accédez aux CGU, à la confidentialité, aux cookies, au support et aux demandes de données Coursia.',
  ogTitle: 'Informations légales Coursia',
  ogDescription: 'Documents légaux et support Coursia pendant la phase de lancement.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <section class="mx-auto max-w-6xl py-10">
    <BaseBadge tone="neutral">Légal</BaseBadge>
    <h1 class="mt-5 text-5xl font-black">Informations légales et support.</h1>
    <p class="mt-5 max-w-3xl text-lg leading-8 text-coursia-muted">
      Version {{ publicLegalContent.version }} — entrée en vigueur le
      {{ publicLegalContent.effectiveDate }}. Documents à maintenir cohérents avec
      {{ publicLegalContent.references.join(' et ') }}.
    </p>

    <div class="mt-10 grid gap-5 md:grid-cols-3">
      <NuxtLink
        v-for="document in publicLegalContent.documents"
        :key="document.slug"
        :to="`/legal/${document.slug}`"
        class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
      >
        <h2 class="text-2xl font-black">{{ document.title }}</h2>
        <p class="mt-4 leading-7 text-coursia-muted">{{ document.summary }}</p>
      </NuxtLink>
    </div>

    <div class="mt-8 rounded-[1.5rem] bg-coursia-surface-muted p-6">
      <h2 class="text-2xl font-black">Demandes données et support</h2>
      <p class="mt-4 leading-7 text-coursia-muted">
        Les demandes d’accès, export et suppression sont expliquées sur la page support.
      </p>
      <NuxtLink to="/support" class="mt-5 inline-flex font-black text-coursia-primary">
        Ouvrir la page support →
      </NuxtLink>
    </div>
  </section>
</template>

