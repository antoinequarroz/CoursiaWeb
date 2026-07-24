<script setup lang="ts">
definePageMeta({
  layout: 'public',
})

useSeoMeta({
  title: 'Mentions légales — Coursia',
  description: 'Informations légales provisoires de Coursia pendant la phase de lancement.',
})
</script>

<template>
  <section class="rounded-coursia-xl bg-coursia-surface p-8 shadow-coursia-sm ring-1 ring-coursia-border">
    <BaseBadge>Légal</BaseBadge>
    <h1 class="mt-4 text-4xl font-bold text-coursia-foreground">Mentions légales provisoires</h1>
    <p class="mt-4 max-w-3xl leading-7 text-coursia-muted">
      Cette page prépare l’espace légal public de Coursia. Les informations définitives, la
      politique de confidentialité et les conditions d’utilisation devront être validées avant mise
      en production publique.
    </p>

    <div class="mt-8 grid gap-5 md:grid-cols-2">
      <BaseCard>
        <h2 class="text-xl font-semibold text-coursia-foreground">Contact</h2>
        <p class="mt-3 text-coursia-muted">contact@coursia.local</p>
      </BaseCard>
      <BaseCard>
        <h2 class="text-xl font-semibold text-coursia-foreground">Statut</h2>
        <p class="mt-3 text-coursia-muted">Contenu légal à finaliser avant lancement public.</p>
      </BaseCard>
    </div>
  </section>
</template>
