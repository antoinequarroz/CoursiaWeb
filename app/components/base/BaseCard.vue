<script setup lang="ts">
withDefaults(
  defineProps<{
    glass?: boolean
  }>(),
  {
    glass: false,
  },
)
</script>

<template>
  <article
    class="rounded-coursia-xl border border-coursia-border p-6"
    :class="glass ? 'ds-glass' : 'bg-coursia-surface shadow-coursia-sm'"
  >
    <slot />
  </article>
</template>
