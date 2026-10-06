<template>
  <div class="min-h-svh bg-canvas text-ink">
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="rounded-md p-1 focus-visible:outline-3 focus-visible:outline-primary/40"
          aria-label="Ranjana Bakery & Cafe home"
        >
          <img
            src="/logo.jpg"
            alt="Ranjana Bakery & Cafe"
            width="56"
            height="56"
            class="h-14 w-14 rounded-lg object-cover"
          >
        </NuxtLink>
      </template>
    </UHeader>
    <UMain>
      <slot />
    </UMain>
    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Ranjana Bakery & Cafe · © {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </div>
</template>
