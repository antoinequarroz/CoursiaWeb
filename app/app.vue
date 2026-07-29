<script setup lang="ts">
useHead({
  script: [
    {
      innerHTML:
        "(function(){try{var k='coursia-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light'}})();",
      tagPosition: 'head',
    },
  ],
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
