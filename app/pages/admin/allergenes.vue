<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

await navigateTo('/admin/ingredients?section=allergenes', { replace: true })
</script>

<template>
  <section class="admin-page">
    <div class="admin-card text-sm text-[#667085] dark:text-[#9ca3af]">
      Redirection vers la gestion des ingrédients, allergènes et régimes...
    </div>
  </section>
</template>
