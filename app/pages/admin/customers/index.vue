<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

const route = useRoute()
const query = reactive({ page: 1, pageSize: 5, search: typeof route.query.search === 'string' ? route.query.search : '' })
watch(() => route.query.search, (value) => {
  query.search = typeof value === 'string' ? value : ''
})
type CustomerRow = { id: string, name: string, email: string | null, phone: string | null, status: string, orders: number, loyaltyPoints: number }

const { data: me } = await useFetch<{ data: { permissions: string[] } | null }>('/api/auth/me')
const { data, refresh, pending } = await useFetch<{ data: CustomerRow[], meta: { total: number, pageSize: number } }>('/api/admin/customers', { query })
watch(() => query.search, () => {
  if (query.page !== 1) query.page = 1
})
const open = ref(false)
const editing = ref<CustomerRow | null>(null)
const form = reactive({ name: '', email: '', phone: '', city: '', line1: '' })
const toast = useToast()
const error = ref('')
const saving = ref(false)

function notify(title: string, color: 'success' | 'error' = 'success') {
  toast.add({ title, color })
}
const canCreate = computed(() => me.value?.data?.permissions.includes('customer.create') ?? false)
const canUpdate = computed(() => me.value?.data?.permissions.includes('customer.update') ?? false)
const columns: TableColumn<CustomerRow>[] = [
  { id: 'sn', header: 'SN' },
  { id: 'customer', header: 'Customer' },
  { accessorKey: 'phone', header: 'Phone' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'orders', header: 'Orders' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

function resetForm() {
  form.name = ''
  form.email = ''
  form.phone = ''
  form.city = ''
  form.line1 = ''
}

function openAdd() {
  editing.value = null
  error.value = ''
  resetForm()
  open.value = true
}

function openEdit(customer: CustomerRow) {
  editing.value = customer
  error.value = ''
  form.name = customer.name
  form.email = customer.email ?? ''
  form.phone = customer.phone ?? ''
  form.line1 = ''
  open.value = true
}

async function saveCustomer() {
  error.value = ''
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/customers/${editing.value.id}`, {
        method: 'PATCH',
        body: { name: form.name, phone: form.phone || null }
      })
      notify('Customer updated.')
    } else {
      await $fetch('/api/admin/customers', {
        method: 'POST',
        body: {
          name: form.name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.line1 ? { line1: form.line1, city: form.city || 'Kathmandu' } : undefined
        }
      })
      notify('Customer saved.')
    }
    open.value = false
    await refresh()
  } catch (caught) {
    error.value = caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data
      ? String(caught.data.statusMessage)
      : 'Could not save the customer.'
    notify(error.value, 'error')
  } finally {
    saving.value = false
  }
}

function serial(index: number) {
  return (query.page - 1) * query.pageSize + index + 1
}

async function setStatus(customer: CustomerRow) {
  try {
    const status = customer.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE'
    await $fetch(`/api/admin/customers/${customer.id}`, { method: 'PATCH', body: { status } })
    notify(status === 'INACTIVE' ? 'Customer marked inactive.' : 'Customer activated.')
    await refresh()
  } catch (caught) {
    const text = caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data
      ? String(caught.data.statusMessage)
      : 'Could not change the customer status.'
    notify(text, 'error')
  }
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Customers">
      <UInput
        v-model="query.search"
        icon="i-lucide-search"
        placeholder="Search customers"
        aria-label="Search customers"
        class="w-full sm:w-64"
      />
      <UButton
        v-if="canCreate"
        icon="i-lucide-plus"
        @click="openAdd"
      >
        Add
      </UButton>
    </PageHeader>
    <LoadingSkeleton v-if="pending && !data" />
    <div
      v-else-if="data?.data?.length"
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
        <template #customer-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-medium text-brand-700">
              {{ row.original.name.slice(0, 1) }}
            </span>
            <span class="truncate font-medium text-ink">{{ row.original.name }}</span>
          </div>
        </template>
        <template #phone-cell="{ row }">
          {{ row.original.phone || '—' }}
        </template>
        <template #email-cell="{ row }">
          {{ row.original.email || '—' }}
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip text="View">
              <UButton
                :to="`/admin/customers/${row.original.id}`"
                icon="i-lucide-eye"
                color="neutral"
                variant="soft"
                size="sm"
                aria-label="View"
              />
            </UTooltip>
            <UTooltip
              v-if="canUpdate"
              text="Edit"
            >
              <UButton
                icon="i-lucide-pencil"
                color="primary"
                variant="soft"
                size="sm"
                aria-label="Edit"
                @click="openEdit(row.original)"
              />
            </UTooltip>
            <UTooltip
              v-if="canUpdate"
              :text="row.original.status === 'INACTIVE' ? 'Activate' : 'Deactivate'"
            >
              <UButton
                :icon="row.original.status === 'INACTIVE' ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                color="neutral"
                variant="soft"
                size="sm"
                :aria-label="row.original.status === 'INACTIVE' ? 'Activate' : 'Deactivate'"
                @click="setStatus(row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>
      <TablePager
        v-if="data.meta"
        v-model:page="query.page"
        v-model:rows="query.pageSize"
        :total="data.meta.total"
      />
    </div>
    <EmptyState
      v-else
      icon="i-lucide-users"
      title="No customers yet"
      description="Customers you add will show up here."
      :action="canCreate ? 'Add' : undefined"
      @action="openAdd"
    />
    <FormModal
      v-model:open="open"
      wide
      form-id="customer-form"
      :title="editing ? 'Edit customer' : 'Add customer'"
      :saving="saving"
      @submit="saveCustomer"
    >
      <UFormField
        label="Name"
        required
      >
        <UInput
          v-model="form.name"
          class="w-full"
          required
        />
      </UFormField>
      <UFormField label="Phone">
        <UInput
          v-model="form.phone"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="!editing"
        label="Email"
      >
        <UInput
          v-model="form.email"
          type="email"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="!editing"
        label="Address"
        class="sm:col-span-2"
      >
        <UInput
          v-model="form.line1"
          class="w-full"
        />
      </UFormField>
      <p
        v-if="error"
        class="text-sm text-danger-600 sm:col-span-2"
        role="alert"
      >
        {{ error }}
      </p>
    </FormModal>
  </section>
</template>
