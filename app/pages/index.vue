<template>
  <section class="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center">
    <img
      src="/logo.jpg"
      alt="Ranjana Bakery & Cafe"
      width="280"
      height="280"
      class="h-56 w-56 rounded-3xl object-cover shadow-lg"
    >
    <h1 class="mt-8 font-display text-5xl text-ink">
      Ranjana Bakery & Cafe
    </h1>
    <p class="mt-3 max-w-xl text-lg text-muted">
      Fresh cakes, bread, and cafe favorites from our kitchen.
    </p>
    <UButton
      to="/admin/login"
      class="mt-8"
      color="neutral"
      variant="soft"
    >
      Staff sign in
    </UButton>
  </section>
</template>
