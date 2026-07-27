<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

await navigateTo('/admin/ingredients?section=allergenes', { replace: true })
</script>

<template>
  <section class="rounded-2xl border border-[#e6e1d8] bg-white p-5 text-sm text-[#667085]">
    Redirection vers la gestion des ingrédients, allergènes et régimes...
  </section>
</template>
