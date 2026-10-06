<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <p
        v-if="eyebrow"
        class="text-[13px] text-ink-muted"
      >
        {{ eyebrow }}
      </p>
      <h1 class="text-[28px] leading-tight font-semibold tracking-tight text-ink">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="mt-1 max-w-2xl text-sm text-ink-muted"
      >
        {{ description }}
      </p>
    </div>
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      <slot />
    </div>
  </header>
</template>
