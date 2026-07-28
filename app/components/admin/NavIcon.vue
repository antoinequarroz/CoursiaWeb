<script setup lang="ts">
defineProps<{
  name: string
}>()
</script>

<template>
  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'dashboard'">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5z" />
      <path d="M13 5.5A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5z" />
      <path d="M4 14.5A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M13 14.5A1.5 1.5 0 0 1 14.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5z" />
    </template>

    <template v-else-if="name === 'recipes'">
      <path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M8.5 8h7" />
      <path d="M8.5 12h7" />
      <path d="M8.5 16h4" />
    </template>

    <template v-else-if="name === 'import'">
      <path d="M12 4v10" />
      <path d="m8.5 10.5 3.5 3.5 3.5-3.5" />
      <path d="M5 18.5h14" />
    </template>

    <template v-else-if="name === 'publication'">
      <path d="M5 19V5l14 7-14 7Z" />
      <path d="M5 12h7" />
    </template>

    <template v-else-if="name === 'media'">
      <path d="M5.5 6h13A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-9A1.5 1.5 0 0 1 5.5 6Z" />
      <path d="m6.5 16 3.5-4 3 3 2-2.2 2.5 3.2" />
      <path d="M15.5 9.5h.01" />
    </template>

    <template v-else-if="name === 'ingredients'">
      <path d="M6 13c5.5 0 9-3.5 9-9 3.2 2.2 4.4 6 2.8 9.1-1.8 3.6-6.4 5.2-10.2 3.4L5 20" />
      <path d="M6 13c1.8.1 4.3 1.1 6 3" />
    </template>

    <template v-else-if="name === 'allergens'">
      <path d="M12 4.5 21 19H3z" />
      <path d="M12 9v4" />
      <path d="M12 16.5h.01" />
    </template>

    <template v-else-if="name === 'matching'">
      <path d="M7 7h6a4 4 0 0 1 0 8H9" />
      <path d="m10 4-3 3 3 3" />
      <path d="M17 17h-6a4 4 0 0 1 0-8h4" />
      <path d="m14 14 3 3-3 3" />
    </template>

    <template v-else-if="name === 'retailers'">
      <path d="M5 10h14l-1 10H6z" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      <path d="M8 14h8" />
    </template>

    <template v-else-if="name === 'products'">
      <path d="M6 7.5 12 4l6 3.5v9L12 20l-6-3.5z" />
      <path d="m6.5 8 5.5 3 5.5-3" />
      <path d="M12 11v8" />
    </template>

    <template v-else-if="name === 'prices'">
      <path d="M20 7.5V14a2 2 0 0 1-2 2h-7l-4.5 4V16H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </template>

    <template v-else-if="name === 'moderation'">
      <path d="M12 3.5 19 6v5.3c0 4.2-2.8 7.2-7 9.2-4.2-2-7-5-7-9.2V6z" />
      <path d="m8.8 12 2.1 2.1 4.4-4.6" />
    </template>

    <template v-else-if="name === 'users'">
      <path d="M15.5 19a4.5 4.5 0 0 0-9 0" />
      <path d="M11 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M18 9v5" />
      <path d="M20.5 11.5h-5" />
    </template>

    <template v-else-if="name === 'subscriptions'">
      <path d="M5.5 7h13A1.5 1.5 0 0 1 20 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5v-7A1.5 1.5 0 0 1 5.5 7Z" />
      <path d="M4 10h16" />
      <path d="M7.5 14h4" />
    </template>

    <template v-else-if="name === 'content'">
      <path d="M6.5 4.5h8L18.5 9v10.5h-12z" />
      <path d="M14.5 4.5V9h4" />
      <path d="M9 13h6" />
      <path d="M9 16h4" />
    </template>

    <template v-else-if="name === 'settings'">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19 12a7.3 7.3 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.3 3.1a7 7 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7.3 7.3 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.8 1l.3 3.1h4.8l.3-3.1a7 7 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
    </template>

    <template v-else-if="name === 'documentation'">
      <path d="M5.5 5.5h7a3 3 0 0 1 3 3v10h-7a3 3 0 0 0-3 3z" />
      <path d="M15.5 8.5h3a1 1 0 0 1 1 1v9h-4" />
      <path d="M8.5 9h4" />
      <path d="M8.5 12h4" />
    </template>

    <template v-else-if="name === 'components'">
      <path d="M6 6h5v5H6z" />
      <path d="M13 6h5v5h-5z" />
      <path d="M6 13h5v5H6z" />
      <path d="M13 13h5v5h-5z" />
    </template>

    <template v-else-if="name === 'notifications'">
      <path d="M18 9.8a6 6 0 0 0-12 0c0 7-2 7.2-2 8.2h16c0-1-2-.9-2-8.2Z" />
      <path d="M9.8 20a2.4 2.4 0 0 0 4.4 0" />
    </template>

    <template v-else-if="name === 'logout'">
      <path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </template>

    <template v-else-if="name === 'search'">
      <path d="M10.8 17.1a6.3 6.3 0 1 0 0-12.6 6.3 6.3 0 0 0 0 12.6Z" />
      <path d="m16 16 3.5 3.5" />
    </template>

    <template v-else>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </template>
  </svg>
</template>
