<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <div class="admin-page-header flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
    <div class="min-w-0">
      <p
        v-if="eyebrow"
        class="text-[0.68rem] font-black uppercase tracking-[0.18em] text-coursia-primary"
      >
        {{ eyebrow }}
      </p>
      <h1 class="mt-1 text-2xl font-black tracking-tight text-coursia-foreground md:text-3xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 max-w-3xl text-sm leading-6 text-coursia-muted">
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.actions" class="flex flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
