<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/logo.jpg', type: 'image/jpeg' },
    { rel: 'apple-touch-icon', href: '/logo.jpg' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Playfair+Display:wght@500;600&display=swap' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'Ranjana Bakery & Cafe',
  description: 'Ranjana Bakery & Cafe',
  ogTitle: 'Ranjana Bakery & Cafe',
  ogImage: '/logo.jpg',
  twitterCard: 'summary'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
  </UApp>
</template>
