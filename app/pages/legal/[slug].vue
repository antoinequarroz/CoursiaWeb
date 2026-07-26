<script setup lang="ts">
import { publicLegalContent } from '#shared/public-site/legal-content'

definePageMeta({ layout: 'public' })

const route = useRoute()
const document = computed(() =>
  publicLegalContent.documents.find((item) => item.slug === route.params.slug),
)

if (!document.value) {
  throw createError({ statusCode: 404, statusMessage: 'Document légal introuvable' })
}

useSeoMeta({
  title: `${document.value.title} — Coursia`,
  description: document.value.summary,
  ogTitle: document.value.title,
  ogDescription: document.value.summary,
  ogType: 'website',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <section class="mx-auto max-w-4xl py-10">
    <NuxtLink to="/legal" class="text-sm font-black text-coursia-primary">← Retour légal</NuxtLink>
    <BaseBadge tone="neutral" class="mt-6">Version {{ publicLegalContent.version }}</BaseBadge>
    <h1 class="mt-5 text-5xl font-black">{{ document?.title }}</h1>
    <p class="mt-4 text-coursia-muted">Entrée en vigueur : {{ publicLegalContent.effectiveDate }}</p>
    <p class="mt-6 text-lg leading-8 text-coursia-muted">{{ document?.summary }}</p>

    <div class="mt-8 rounded-[1.5rem] bg-coursia-surface-muted p-6">
      <h2 class="text-2xl font-black">Traçabilité</h2>
      <p class="mt-4 leading-7 text-coursia-muted">{{ publicLegalContent.traceability }}</p>
      <p class="mt-4 text-sm text-coursia-muted">
        Références : {{ publicLegalContent.references.join(', ') }}.
      </p>
    </div>
  </section>
</template>

