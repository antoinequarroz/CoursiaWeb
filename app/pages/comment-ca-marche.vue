<script setup lang="ts">
import { publicFeatureContent } from '#shared/public-site/features-content'

definePageMeta({
  layout: 'public',
})

useSeoMeta({
  title: 'Comment ça marche — Coursia',
  description:
    'Comprendre le parcours Coursia en six étapes : préférences, recettes, planning, courses, comparaison et économies.',
  ogTitle: 'Comment ça marche — Coursia',
  ogDescription:
    'Le parcours Coursia expliqué simplement, de la recette à la table pour les familles.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const { steps, currentLimits, ctas } = publicFeatureContent
</script>

<template>
  <div class="mx-auto max-w-7xl py-10">
    <section class="grid items-center gap-10 rounded-[2rem] bg-coursia-surface p-8 shadow-coursia-md ring-1 ring-coursia-border lg:grid-cols-[0.8fr_1.2fr] lg:p-12">
      <div>
        <BaseBadge tone="success">Comment ça marche</BaseBadge>
        <h1 class="mt-5 text-5xl font-black leading-tight tracking-tight text-coursia-foreground">
          Six étapes pour passer de l’envie au repas.
        </h1>
        <p class="mt-6 text-lg leading-8 text-coursia-muted">
          Le parcours reste volontairement simple : comprendre le foyer, proposer des recettes,
          organiser la semaine, préparer les courses, comparer et suivre les économies.
        </p>
        <div class="mt-8">
          <a href="mailto:contact@coursia.local?subject=Liste%20d%E2%80%99attente%20Coursia">
            <BaseButton>{{ ctas.waitlist }}</BaseButton>
          </a>
        </div>
      </div>
      <div class="rounded-[1.7rem] bg-coursia-surface-muted p-6">
        <div class="grid gap-3">
          <div
            v-for="(step, index) in steps"
            :key="step.title"
            class="flex items-start gap-4 rounded-2xl bg-coursia-surface p-4"
          >
            <span
              class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-coursia-primary text-sm font-black text-white"
            >
              {{ index + 1 }}
            </span>
            <span>
              <span class="block font-black">{{ step.title }}</span>
              <span class="mt-1 block text-sm leading-6 text-coursia-muted">{{ step.description }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <section id="parcours" class="mt-12">
      <p class="text-xs font-black uppercase tracking-[0.2em] text-coursia-success">
        Parcours complet
      </p>
      <div class="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="(step, index) in steps"
          :key="step.title"
          class="rounded-[1.5rem] border border-coursia-border bg-coursia-surface p-6 shadow-coursia-sm"
        >
          <span class="text-sm font-black text-coursia-accent">Étape {{ index + 1 }}</span>
          <h2 class="mt-3 text-2xl font-black">{{ step.title }}</h2>
          <p class="mt-4 leading-7 text-coursia-muted">{{ step.description }}</p>
        </article>
      </div>
    </section>

    <section class="mt-12 rounded-[1.7rem] bg-coursia-surface-muted p-8">
      <h2 class="text-3xl font-black">Limites actuelles et promesses maîtrisées.</h2>
      <p class="mt-4 max-w-3xl leading-7 text-coursia-muted">
        La page indique clairement ce qui relève d’une maquette, d’une simulation ou d’une dépendance
        future. Cela évite de survendre le produit pendant la phase de lancement.
      </p>
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

