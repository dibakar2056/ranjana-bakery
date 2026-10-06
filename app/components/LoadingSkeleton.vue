<script setup lang="ts">
withDefaults(defineProps<{ lines?: number }>(), { lines: 3 })
</script>

<template>
  <div class="space-y-3" aria-hidden="true">
    <div
      v-for="line in lines"
      :key="line"
      class="h-24 animate-pulse rounded-2xl bg-line/70 motion-reduce:animate-none"
    />
  </div>
</template>
