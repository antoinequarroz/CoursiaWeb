<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  }>(),
  {
    tone: 'neutral',
  },
)

const toneClass = computed(() => {
  const classes = {
    primary: 'border-coursia-primary/30 bg-coursia-primary/10 text-coursia-primary',
    success: 'border-coursia-success/30 bg-coursia-success/10 text-coursia-success',
    warning: 'border-coursia-warning/30 bg-coursia-warning/10 text-coursia-warning',
    danger: 'border-coursia-danger/30 bg-coursia-danger/10 text-coursia-danger',
    neutral: 'border-coursia-border bg-coursia-surface-muted text-coursia-muted',
  } as const

  return classes[props.tone]
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-coursia-sm border px-2.5 py-1 text-xs font-medium"
    :class="toneClass"
  >
    <slot />
  </span>
</template>
