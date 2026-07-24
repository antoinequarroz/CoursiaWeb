<script setup lang="ts">
definePageMeta({
  layout: 'public',
})
</script>

<template>
  <section
    class="rounded-coursia-xl bg-coursia-surface p-8 shadow-coursia-sm ring-1 ring-coursia-border"
  >
    <BaseBadge tone="primary">Coursia</BaseBadge>
    <h1 class="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-coursia-foreground">
      Plateforme web publique initialisée avec Nuxt 4.
    </h1>
    <p class="mt-4 max-w-2xl text-lg text-coursia-muted">
      Cette base fournit la structure commune pour le site public et l’administration.
    </p>
    <div class="mt-6">
      <NuxtLink to="/design-system">
        <BaseButton variant="secondary">Voir le design system</BaseButton>
      </NuxtLink>
    </div>
  </section>
</template>
