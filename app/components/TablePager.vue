<script setup lang="ts">
const page = defineModel<number>('page', { required: true })
const rows = defineModel<number>('rows', { required: true })

const props = defineProps<{
  total: number
}>()

const options = [
  { label: '10', value: '10' },
  { label: '20', value: '20' },
  { label: '50', value: '50' },
  { label: '100', value: '100' }
]
const pageSize = computed({
  get: () => String(rows.value),
  set: (value: string) => {
    rows.value = Number(value)
    if (page.value !== 1) page.value = 1
  }
})
const from = computed(() => props.total === 0 ? 0 : (page.value - 1) * rows.value + 1)
const to = computed(() => Math.min(props.total, page.value * rows.value))
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4">
    <p class="text-sm text-ink-muted">
      {{ from }}–{{ to }} of {{ total }}
    </p>
    <div class="flex items-center gap-2">
      <USelect
        v-model="pageSize"
        :items="options"
        aria-label="Rows per page"
        class="w-24"
      />
      <UPagination
        :page="page"
        :items-per-page="rows"
        :total="total"
        @update:page="page = $event"
      />
    </div>
  </div>
</template>
