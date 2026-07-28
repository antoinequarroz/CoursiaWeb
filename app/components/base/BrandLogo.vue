<script setup lang="ts">
withDefaults(
  defineProps<{
    compact?: boolean
    iconClass?: string
    textClass?: string
  }>(),
  {
    compact: false,
    iconClass: 'h-10 w-10',
    textClass: 'text-lg',
  },
)
</script>

<template>
  <span class="inline-flex items-center gap-3 text-coursia-primary">
    <span
      class="flex items-center justify-center rounded-2xl text-coursia-primary"
      :class="iconClass"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" class="h-3/5 w-3/5" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5V19h11v-8.5" />
        <path d="M9.5 19v-5h5v5" />
      </svg>
    </span>
    <span
      v-if="!compact"
      class="font-black tracking-[0.16em] text-coursia-primary"
      :class="textClass"
    >
      COURSIA
    </span>
  </span>
</template>
