<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint?: string
  icon?: string
  tone?: 'solid'
}>()
</script>

<template>
  <article
    class="rounded-2xl border p-5 shadow-card"
    :class="tone === 'solid' ? 'border-transparent bg-brand-600 text-white' : 'border-line bg-surface text-ink'"
  >
    <div class="flex items-center justify-between gap-3">
      <p class="text-[13px]" :class="tone === 'solid' ? 'text-white/80' : 'text-ink-muted'">
        {{ label }}
      </p>
      <UIcon v-if="icon" :name="icon" class="size-4" :class="tone === 'solid' ? 'text-white' : 'text-accent'" />
    </div>
    <p class="mt-3 text-[28px] leading-none font-semibold tracking-tight">
      {{ value }}
    </p>
    <p v-if="hint" class="mt-2 text-[13px]" :class="tone === 'solid' ? 'text-white/75' : 'text-ink-muted'">
      {{ hint }}
    </p>
  </article>
</template>
