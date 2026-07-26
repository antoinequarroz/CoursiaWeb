<script setup lang="ts">
import { publicEngagementContent } from '#shared/public-site/engagement-content'

definePageMeta({ layout: 'public' })

useSeoMeta({
  title: 'FAQ — Coursia',
  description:
    'Réponses aux questions fréquentes sur le fonctionnement, les prix, les données, les allergies et la disponibilité de Coursia.',
  ogTitle: 'FAQ Coursia',
  ogDescription: 'Tout comprendre avant le lancement de Coursia.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const faq = publicEngagementContent.faq
</script>

<template>
  <section class="mx-auto max-w-5xl py-10">
    <BaseBadge tone="success">FAQ</BaseBadge>
    <h1 class="mt-5 text-5xl font-black">Questions fréquentes.</h1>
    <p class="mt-5 max-w-3xl text-lg leading-8 text-coursia-muted">
      La FAQ couvre fonctionnement, prix, données, allergies et disponibilité avant le lancement.
    </p>

    <div class="mt-10 grid gap-5">
      <article
        v-for="item in faq"
        :key="item.question"
        class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
      >
        <p class="text-xs font-black uppercase tracking-[0.18em] text-coursia-success">
          {{ item.topic }}
        </p>
        <h2 class="mt-3 text-2xl font-black">{{ item.question }}</h2>
        <p class="mt-4 leading-7 text-coursia-muted">{{ item.answer }}</p>
      </article>
    </div>
  </section>
</template>

