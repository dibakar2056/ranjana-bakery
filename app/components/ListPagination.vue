<script setup lang="ts">
const page = defineModel<number>('page', { required: true })

const props = defineProps<{
  total: number
  pageSize?: number
}>()

const size = computed(() => props.pageSize || 20)
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / size.value)))
const from = computed(() => props.total === 0 ? 0 : (page.value - 1) * size.value + 1)
const to = computed(() => Math.min(props.total, page.value * size.value))
</script>

<template>
  <nav v-if="total > 0" class="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pagination">
    <p class="text-sm text-ink-muted">
      {{ from }}–{{ to }} of {{ total }}
    </p>
    <div class="flex items-center gap-2">
      <UTooltip text="Previous">
        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-chevron-left" aria-label="Previous" :disabled="page <= 1" @click="page -= 1" />
      </UTooltip>
      <span class="text-sm text-ink">{{ page }} / {{ pageCount }}</span>
      <UTooltip text="Next">
        <UButton color="neutral" variant="outline" size="sm" icon="i-lucide-chevron-right" aria-label="Next" :disabled="page >= pageCount" @click="page += 1" />
      </UTooltip>
    </div>
  </nav>
</template>
