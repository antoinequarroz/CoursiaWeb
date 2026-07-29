<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    icon?: string
  }>(),
  {
    description: '',
    icon: 'default',
  },
)
</script>

<template>
  <div class="grid place-items-center px-4 py-10 text-center">
    <div class="max-w-sm">
      <span class="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-coursia-primary/10 text-coursia-primary">
        <AdminNavIcon :name="icon" />
      </span>
      <p class="mt-4 font-black text-coursia-foreground">
        {{ title }}
      </p>
      <p v-if="description" class="mt-2 text-sm leading-6 text-coursia-muted">
        {{ description }}
      </p>
      <div v-if="$slots.actions" class="mt-5 flex justify-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
