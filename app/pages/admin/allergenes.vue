<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

type SafetyItem = {
  code: string
  label: string
  description: string
  tone: BadgeTone
}

const allergens: SafetyItem[] = [
  { code: 'gluten', label: 'Gluten', description: 'Blé, orge, seigle et produits dérivés.', tone: 'danger' },
  { code: 'milk', label: 'Lait', description: 'Lait, lactose et produits laitiers.', tone: 'danger' },
  { code: 'eggs', label: 'Œufs', description: 'Œufs et préparations contenant des œufs.', tone: 'danger' },
  { code: 'peanuts', label: 'Arachides', description: 'Arachides et traces déclarées.', tone: 'danger' },
  { code: 'nuts', label: 'Fruits à coque', description: 'Noix, noisettes, amandes et assimilés.', tone: 'danger' },
  { code: 'soy', label: 'Soja', description: 'Soja, protéines de soja et dérivés.', tone: 'warning' },
  { code: 'fish', label: 'Poisson', description: 'Poissons et ingrédients associés.', tone: 'warning' },
  { code: 'shellfish', label: 'Crustacés', description: 'Crustacés, mollusques et produits proches.', tone: 'warning' },
  { code: 'sesame', label: 'Sésame', description: 'Graines, huiles et préparations au sésame.', tone: 'warning' },
]

const diets: SafetyItem[] = [
  { code: 'vegetarian', label: 'Végétarien', description: 'Sans viande ni poisson.', tone: 'success' },
  { code: 'vegan', label: 'Vegan', description: 'Sans produit d’origine animale.', tone: 'success' },
  { code: 'gluten_free', label: 'Sans gluten', description: 'Recettes compatibles sans gluten.', tone: 'primary' },
  { code: 'lactose_free', label: 'Sans lactose', description: 'Recettes compatibles sans lactose.', tone: 'primary' },
  { code: 'low_fodmap', label: 'Low FODMAP', description: 'Régime digestif spécifique.', tone: 'neutral' },
]

const controls = [
  {
    title: 'Référentiel ingrédients',
    text: 'Les allergènes sont reliés aux ingrédients canoniques. C’est cette donnée qui doit rester fiable pour les recettes et l’app mobile.',
  },
  {
    title: 'Impact recette',
    text: 'Une modification peut changer les filtres, les alertes utilisateur et la sécurité alimentaire.',
  },
  {
    title: 'Audit requis',
    text: 'Les changements sensibles doivent être faits par un rôle autorisé et rester traçables.',
  },
]
</script>

<template>
  <section class="admin-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-coursia-primary">COUR-98</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-[-0.03em] text-coursia-text">
          Allergènes et régimes
        </h1>
        <p class="mt-2 max-w-3xl text-sm text-coursia-muted">
          Vue de pilotage du référentiel alimentaire. Les allergènes sont branchés sur les ingrédients ;
          les régimes restent contrôlés côté recettes et contenus produit.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/admin/ingredients" class="inline-flex cursor-pointer items-center justify-center rounded-coursia-md border border-coursia-border bg-coursia-surface px-4 py-2.5 text-sm font-semibold text-coursia-text transition hover:bg-coursia-background">
          Tous les ingrédients
        </NuxtLink>
        <NuxtLink to="/admin/recettes" class="inline-flex cursor-pointer items-center justify-center rounded-coursia-md bg-coursia-primary px-4 py-2.5 text-sm font-semibold text-coursia-primary-contrast shadow-coursia-sm transition hover:opacity-90">
          Recettes
        </NuxtLink>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <article
        v-for="control in controls"
        :key="control.title"
        class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm"
      >
        <p class="text-sm font-semibold text-coursia-text">{{ control.title }}</p>
        <p class="mt-2 text-sm leading-6 text-coursia-muted">{{ control.text }}</p>
      </article>
    </div>

    <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Allergènes</p>
          <h2 class="mt-2 text-lg font-semibold text-coursia-text">Filtres reliés aux ingrédients</h2>
          <p class="mt-1 text-sm text-coursia-muted">
            Clique un allergène pour ouvrir le catalogue des ingrédients filtré sur la relation réelle Supabase.
          </p>
        </div>
        <BaseBadge tone="neutral">{{ allergens.length }} allergènes</BaseBadge>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="allergen in allergens"
          :key="allergen.code"
          :to="`/admin/ingredients?allergen=${allergen.code}`"
          class="group cursor-pointer rounded-2xl border border-coursia-border bg-coursia-background p-4 transition hover:-translate-y-0.5 hover:border-coursia-primary/30 hover:shadow-coursia-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-coursia-text">{{ allergen.label }}</p>
              <p class="mt-1 text-xs text-coursia-muted">{{ allergen.code }}</p>
            </div>
            <BaseBadge :tone="allergen.tone">Filtrer</BaseBadge>
          </div>
          <p class="mt-3 text-sm leading-6 text-coursia-muted">{{ allergen.description }}</p>
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Régimes</p>
          <h2 class="mt-2 text-lg font-semibold text-coursia-text">Compatibilités recette</h2>
          <p class="mt-1 text-sm text-coursia-muted">
            Les régimes sont utilisés pour classer les recettes et guider les filtres de l’application.
          </p>
        </div>
        <BaseBadge tone="neutral">{{ diets.length }} régimes</BaseBadge>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article
          v-for="diet in diets"
          :key="diet.code"
          class="rounded-2xl border border-coursia-border bg-coursia-background p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="font-semibold text-coursia-text">{{ diet.label }}</p>
            <BaseBadge :tone="diet.tone">{{ diet.code }}</BaseBadge>
          </div>
          <p class="mt-3 text-sm leading-6 text-coursia-muted">{{ diet.description }}</p>
        </article>
      </div>
    </section>

    <section class="rounded-2xl border border-coursia-border bg-coursia-surface p-5 shadow-coursia-sm">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-coursia-primary">Prochaine étape</p>
          <h2 class="mt-2 text-lg font-semibold text-coursia-text">Édition fine du référentiel</h2>
          <p class="mt-2 text-sm leading-6 text-coursia-muted">
            La page ingrédients permet déjà de modifier les champs branchés. La suite technique sera d’ajouter
            l’édition explicite des relations allergènes, synonymes et impact avant fusion.
          </p>
        </div>
        <NuxtLink to="/admin/ingredients" class="inline-flex cursor-pointer items-center justify-center rounded-coursia-md bg-coursia-primary px-4 py-2.5 text-sm font-semibold text-coursia-primary-contrast shadow-coursia-sm transition hover:opacity-90">
          Ouvrir le référentiel
        </NuxtLink>
      </div>
    </section>
  </section>
</template>
