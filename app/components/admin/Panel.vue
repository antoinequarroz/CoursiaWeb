<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
    padded?: boolean
  }>(),
  {
    title: '',
    description: '',
    padded: true,
  },
)
</script>

<template>
  <section class="admin-panel overflow-hidden rounded-2xl border border-coursia-border bg-coursia-surface shadow-coursia-sm">
    <div
      v-if="title || description || $slots.header || $slots.actions"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-coursia-border px-4 py-3"
    >
      <div class="min-w-0">
        <slot name="header">
          <h2 v-if="title" class="text-base font-black text-coursia-foreground">
            {{ title }}
          </h2>
          <p v-if="description" class="mt-1 text-xs leading-5 text-coursia-muted">
            {{ description }}
          </p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </div>

    <div :class="padded ? 'p-4' : ''">
      <slot />
    </div>
  </section>
</template>
