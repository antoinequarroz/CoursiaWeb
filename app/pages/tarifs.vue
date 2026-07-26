<script setup lang="ts">
import {
  publicPricingContent,
  type PublicPricingFeatureKey,
} from '#shared/public-site/pricing-content'

definePageMeta({
  layout: 'public',
})

useSeoMeta({
  title: 'Tarifs — Coursia',
  description:
    'Comparez les abonnements Coursia Gratuit, Standard, Premium et Famille avec prix mensuels, annuels, limites et conditions de renouvellement.',
  ogTitle: 'Tarifs Coursia',
  ogDescription:
    'Une comparaison claire des plans Coursia, sans promettre d’achat web tant que le paiement n’est pas disponible.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

const pricing = publicPricingContent

const formatPrice = (price: number) => {
  if (price === 0) {
    return '0 CHF'
  }

  return `${price.toFixed(price % 1 === 0 ? 0 : 2).replace('.', ',')} CHF`
}
</script>

<template>
  <div class="mx-auto max-w-7xl py-10">
    <section class="rounded-[2rem] bg-coursia-surface p-8 shadow-coursia-md ring-1 ring-coursia-border lg:p-12">
      <BaseBadge tone="warning">Tarifs</BaseBadge>
      <h1 class="mt-5 max-w-3xl text-5xl font-black leading-tight tracking-tight text-coursia-foreground">
        Comparez Gratuit, Standard, Premium et Famille.
      </h1>
      <p class="mt-6 max-w-3xl text-lg leading-8 text-coursia-muted">
        Les plans sont présentés pour comparer les fonctionnalités, limites, prix mensuels et prix
        annuels. La matrice reste reliée à {{ pricing.source }} et devra être confirmée avant une
        publication commerciale définitive.
      </p>
      <p class="mt-5 rounded-2xl bg-coursia-surface-muted p-4 text-sm leading-6 text-coursia-muted">
        {{ pricing.purchaseAvailability }}
      </p>
    </section>

    <section class="mt-10 grid gap-5 lg:grid-cols-4">
      <article
        v-for="plan in pricing.plans"
        :key="plan.name"
        class="relative rounded-[1.6rem] border bg-coursia-surface p-6 shadow-coursia-sm"
        :class="plan.recommended ? 'border-coursia-primary ring-2 ring-coursia-primary/10' : 'border-coursia-border'"
      >
        <span
          v-if="plan.recommended"
          class="absolute right-5 top-5 rounded-full bg-coursia-primary px-3 py-1 text-xs font-black text-white"
        >
          {{ plan.recommendationLabel }}
        </span>
        <h2 class="text-2xl font-black">{{ plan.name }}</h2>
        <p class="mt-3 min-h-14 text-sm leading-6 text-coursia-muted">{{ plan.audience }}</p>

        <div class="mt-6">
          <p class="text-4xl font-black">{{ formatPrice(plan.monthlyPrice) }}</p>
          <p class="mt-1 text-sm text-coursia-muted">par mois</p>
          <p class="mt-3 text-sm font-bold text-coursia-foreground">
            {{ formatPrice(plan.annualPrice) }} / an
          </p>
        </div>

        <a
          href="mailto:contact@coursia.local?subject=Tarifs%20Coursia"
          class="mt-6 inline-flex w-full justify-center rounded-coursia-md bg-coursia-primary px-4 py-3 text-sm font-black text-white transition hover:opacity-90"
          :aria-label="`${plan.cta ?? 'Suivre le lancement'} pour le plan ${plan.name}`"
        >
          {{ plan.cta ?? 'Suivre le lancement' }}
        </a>

        <div class="mt-6">
          <h3 class="text-sm font-black uppercase tracking-[0.16em] text-coursia-muted">Limites</h3>
          <ul class="mt-3 space-y-2 text-sm leading-6 text-coursia-muted">
            <li v-for="limit in plan.limits" :key="limit">• {{ limit }}</li>
          </ul>
        </div>
      </article>
    </section>

    <section class="mt-12 overflow-hidden rounded-[1.7rem] border border-coursia-border bg-coursia-surface shadow-coursia-sm">
      <div class="border-b border-coursia-border p-6">
        <h2 class="text-3xl font-black">Comparaison détaillée</h2>
        <p class="mt-3 text-coursia-muted">
          Les fonctions sont comparables plan par plan pour éviter une présentation trompeuse du plan
          recommandé.
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-[860px] w-full text-left text-sm">
          <caption class="sr-only">
            Comparaison des abonnements Coursia Gratuit, Standard, Premium et Famille
          </caption>
          <thead class="bg-coursia-surface-muted text-coursia-foreground">
            <tr>
              <th scope="col" class="px-5 py-4 font-black">Fonctionnalité</th>
              <th
                v-for="plan in pricing.plans"
                :key="plan.name"
                scope="col"
                class="px-5 py-4 font-black"
              >
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pricing.comparisonRows"
              :key="row.key"
              class="border-t border-coursia-border"
            >
              <th scope="row" class="px-5 py-4 font-black">{{ row.label }}</th>
              <td
                v-for="plan in pricing.plans"
                :key="`${plan.name}-${row.key}`"
                class="px-5 py-4 text-coursia-muted"
              >
                {{ plan.features[row.key as PublicPricingFeatureKey] }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mt-12 grid gap-5 md:grid-cols-2">
      <article class="rounded-[1.5rem] bg-coursia-surface-muted p-6">
        <h2 class="text-2xl font-black">Renouvellement</h2>
        <p class="mt-4 leading-7 text-coursia-muted">{{ pricing.renewalNotice }}</p>
      </article>
      <article class="rounded-[1.5rem] bg-coursia-surface-muted p-6">
        <h2 class="text-2xl font-black">Statut de validation</h2>
        <p class="mt-4 leading-7 text-coursia-muted">{{ pricing.validationStatus }}</p>
      </article>
    </section>
  </div>
</template>

