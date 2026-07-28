<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
)

const variantClass = computed(() => {
  const classes = {
    primary: 'bg-coursia-primary text-coursia-primary-contrast shadow-coursia-sm hover:opacity-90',
    secondary:
      'border border-coursia-border bg-coursia-surface text-coursia-foreground hover:bg-coursia-surface-muted',
    ghost: 'text-coursia-primary hover:bg-coursia-primary/10',
  } as const

  return classes[props.variant]
})

const sizeClass = computed(() => {
  const classes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
  } as const

  return classes[props.size]
})
</script>

<template>
  <button
    class="ds-focus-ring inline-flex cursor-pointer items-center justify-center rounded-coursia-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variantClass, sizeClass]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
