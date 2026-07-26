<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} · FleetPro` : 'FleetPro'),
  htmlAttrs: { lang: 'en' },
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    },
  ],
  meta: [
    { name: 'theme-color', content: '#f1f2ef' },
    { name: 'description', content: 'Live tracking for professional vehicle fleets.' },
  ],
})
</script>

<template>
  <NuxtPage />
</template>
