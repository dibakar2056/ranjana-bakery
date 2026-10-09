<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

type AuditRow = {
  id: string
  action: string
  entity: string
  actor: string
  createdAt: string
}

const query = reactive({ page: 1, pageSize: 10 })

function serial(index: number) {
  return (query.page - 1) * query.pageSize + index + 1
}

const columns: TableColumn<AuditRow>[] = [
  { id: 'sn', header: 'SN' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'entity', header: 'Record' },
  { accessorKey: 'actor', header: 'Actor' },
  { accessorKey: 'createdAt', header: 'Date' }
]

const { data, pending } = await useFetch<{ data: AuditRow[], meta: { total: number, pageSize: number } }>('/api/admin/audit-logs', { query })
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Audit log" />
    <LoadingSkeleton v-if="pending && !data" />
    <EmptyState
      v-else-if="!(data?.data?.length)"
      icon="i-lucide-scroll-text"
      title="No audit records yet"
      description="Staff actions will appear here once someone changes a record."
    />
    <div
      v-else
      class="overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
    >
      <UTable
        :data="data.data"
        :columns="columns"
        :loading="pending"
        class="flex-1"
      >
        <template #sn-cell="{ row }">
          {{ serial(row.index) }}
        </template>
        <template #action-cell="{ row }">
          <span class="font-medium">{{ row.original.action }}</span>
        </template>
        <template #createdAt-cell="{ row }">
          {{ new Date(row.original.createdAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) }}
        </template>
      </UTable>
      <TablePager
        v-if="data.meta"
        v-model:page="query.page"
        v-model:rows="query.pageSize"
        :total="data.meta.total"
      />
    </div>
  </section>
</template>
