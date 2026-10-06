<script setup lang="ts">
defineProps<{
  title: string
  description: string
  icon?: string
  action?: string
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
    <UIcon v-if="icon" :name="icon" class="mx-auto size-6 text-accent" />
    <h2 class="mt-3 text-lg font-medium text-ink">
      {{ title }}
    </h2>
    <p class="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
      {{ description }}
    </p>
    <UButton v-if="action" class="mt-5" @click="$emit('action')">
      {{ action }}
    </UButton>
  </div>
</template>
