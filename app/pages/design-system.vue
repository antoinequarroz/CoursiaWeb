<script setup lang="ts">
import { coursiaDesignTokens } from '#shared/design-system/tokens'

definePageMeta({
  layout: 'public',
})

const tones = ['primary', 'success', 'warning', 'danger', 'neutral'] as const
</script>

<template>
  <div class="grid gap-10">
    <section class="grid gap-4">
      <BaseBadge tone="primary">Design system</BaseBadge>
      <div class="max-w-3xl">
        <h1 class="text-4xl font-bold tracking-tight text-coursia-foreground">
          Tokens et composants Coursia
        </h1>
        <p class="mt-4 text-lg text-coursia-muted">
          Cette page documente les couleurs, thèmes, espacements, rayons, ombres, effets glass et
          variantes accessibles utilisés par le site public et l’administration.
        </p>
      </div>
    </section>

    <section class="grid gap-4 md:grid-cols-2">
      <BaseCard>
        <h2 class="text-xl font-semibold">Thème courant</h2>
        <p class="mt-2 text-coursia-muted">
          Le bouton modifie `data-theme` sur le document et réutilise les mêmes tokens CSS.
        </p>
        <div class="mt-5">
          <ThemeToggle />
        </div>
      </BaseCard>

      <BaseCard glass>
        <h2 class="text-xl font-semibold">Effet glass</h2>
        <p class="mt-2 text-coursia-muted">
          Le fond, la bordure, l’ombre et le flou sont centralisés dans les tokens globaux.
        </p>
      </BaseCard>
    </section>

    <section class="grid gap-4">
      <h2 class="text-2xl font-semibold">Palette officielle</h2>
      <div class="grid gap-4 md:grid-cols-2">
        <BaseCard v-for="theme in ['light', 'dark']" :key="theme" :data-theme="theme">
          <h3 class="font-semibold capitalize">{{ theme }}</h3>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <div
              v-for="(value, name) in coursiaDesignTokens.color[theme]"
              :key="name"
              class="rounded-coursia-md border border-coursia-border bg-coursia-surface-muted p-3"
            >
              <div
                class="h-10 rounded-coursia-sm border border-coursia-border"
                :style="{ backgroundColor: value }"
              />
              <p class="mt-2 text-sm font-medium">{{ name }}</p>
              <p class="font-mono text-xs text-coursia-muted">{{ value }}</p>
            </div>
          </div>
        </BaseCard>
      </div>
    </section>

    <section class="grid gap-4">
      <h2 class="text-2xl font-semibold">Composants de base</h2>
      <BaseCard>
        <div class="flex flex-wrap gap-3">
          <BaseButton>Action primaire</BaseButton>
          <BaseButton variant="secondary">Action secondaire</BaseButton>
          <BaseButton variant="ghost">Action discrète</BaseButton>
          <BaseButton disabled>Action désactivée</BaseButton>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <BaseBadge v-for="tone in tones" :key="tone" :tone="tone">
            {{ tone }}
          </BaseBadge>
        </div>
      </BaseCard>
    </section>
  </div>
</template>
