<script setup lang="ts">
import { publicFeatureContent } from '#shared/public-site/features-content'

definePageMeta({
  layout: 'public',
})

useSeoMeta({
  title: 'Fonctionnalités — Coursia',
  description:
    'Découvrez les fonctionnalités Coursia : recettes, planning repas, courses, comparaison multi-enseignes et suivi du budget familial.',
  ogTitle: 'Fonctionnalités Coursia',
  ogDescription:
    'Une app pour relier recettes, planning, courses, comparaison et économies dans le quotidien des familles.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const { features, currentLimits, ctas } = publicFeatureContent
</script>

<template>
  <div class="mx-auto max-w-7xl py-10">
    <section class="rounded-[2rem] bg-coursia-surface p-8 shadow-coursia-md ring-1 ring-coursia-border lg:p-12">
      <BaseBadge tone="primary">Fonctionnalités</BaseBadge>
      <h1 class="mt-5 max-w-3xl text-5xl font-black leading-tight tracking-tight text-coursia-foreground">
        Tout le parcours repas, du choix de la recette aux économies.
      </h1>
      <p class="mt-6 max-w-3xl text-lg leading-8 text-coursia-muted">
        Coursia explique simplement les étapes clés du quotidien : recettes, planning, courses,
        comparaison multi-enseignes et budget. Les contenus sont centralisés pour rester cohérents
        entre les pages publiques.
      </p>
      <div class="mt-8 flex flex-wrap gap-4">
        <NuxtLink to="/comment-ca-marche">
          <BaseButton>{{ ctas.howItWorks }}</BaseButton>
        </NuxtLink>
        <a href="mailto:contact@coursia.local?subject=Liste%20d%E2%80%99attente%20Coursia">
          <BaseButton variant="secondary">{{ ctas.waitlist }}</BaseButton>
        </a>
      </div>
    </section>

    <section class="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="feature in features"
        :key="feature.title"
        class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
      >
        <div
          class="flex h-36 items-center justify-center rounded-[1.25rem] bg-coursia-surface-muted text-sm font-black uppercase tracking-[0.18em] text-coursia-primary"
        >
          {{ feature.visual }}
        </div>
        <h2 class="mt-6 text-2xl font-black text-coursia-foreground">{{ feature.title }}</h2>
        <p class="mt-4 leading-7 text-coursia-muted">{{ feature.description }}</p>
      </article>
    </section>

    <section class="mt-12 rounded-[1.7rem] bg-coursia-surface-muted p-8">
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-muted">
        Limites actuelles
      </p>
      <h2 class="mt-4 text-3xl font-black">Ce qui est formulé honnêtement.</h2>
      <ul class="mt-6 grid gap-4 md:grid-cols-2">
        <li
          v-for="limit in currentLimits"
          :key="limit"
          class="rounded-2xl bg-coursia-surface p-5 leading-7 text-coursia-muted"
        >
          {{ limit }}
        </li>
      </ul>
    </section>
  </div>
</template>

