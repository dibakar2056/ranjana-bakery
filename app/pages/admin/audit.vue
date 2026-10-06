<script setup lang="ts">
definePageMeta({ middleware: ['staff'], layout: 'admin' })

const query = reactive({ page: 1 })

function serial(index: number) {
  const size = data.value?.meta.pageSize ?? 20
  return (query.page - 1) * size + index + 1
}
const { data, pending } = await useFetch<{ data: Array<{ id: string, action: string, entity: string, actor: string, createdAt: string }>, meta: { total: number, pageSize: number } }>('/api/admin/audit-logs', { query })
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Audit log" />
    <LoadingSkeleton v-if="pending" />
    <EmptyState
      v-else-if="!(data?.data?.length)"
      icon="i-lucide-scroll-text"
      title="No audit records yet"
      description="Staff actions will appear here once someone changes a record."
    />
    <div v-else>
    <div class="mb-2 hidden grid-cols-[3rem_1fr] px-4 text-xs font-medium tracking-wide text-ink-muted uppercase sm:grid">
      <span>SN</span>
      <span>Record</span>
    </div>
    <ul class="space-y-2">
      <li v-for="(entry, index) in data?.data ?? []" :key="entry.id" class="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-card">
        <span class="w-8 shrink-0 text-sm text-ink-muted">{{ serial(index) }}</span>
        <div class="min-w-0">
        <p class="font-medium">
          {{ entry.action }}
        </p>
        <p class="text-sm text-muted">
          {{ entry.entity }} · {{ entry.actor }} · {{ new Date(entry.createdAt).toLocaleString() }}
        </p>
        </div>
      </li>
    </ul>
    <ListPagination v-if="data?.meta" v-model:page="query.page" :total="data.meta.total" :page-size="data.meta.pageSize" />
    </div>
  </section>
</template>
