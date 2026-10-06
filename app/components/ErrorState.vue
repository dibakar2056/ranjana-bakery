<script setup lang="ts">
defineProps<{
  title?: string
  description: string
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    class="rounded-2xl border border-line bg-surface px-6 py-12 text-center"
    role="alert"
  >
    <h2 class="text-lg font-medium text-ink">
      {{ title || 'Something went wrong' }}
    </h2>
    <p class="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
      {{ description }}
    </p>
    <UButton
      class="mt-5"
      color="neutral"
      variant="outline"
      @click="$emit('retry')"
    >
      Try again
    </UButton>
  </div>
</template>
