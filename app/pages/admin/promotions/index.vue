<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

type PromotionRow = {
  id: string
  name: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY'
  value: string
  code: string | null
  minimumOrder: string
  usageLimit: number | null
  usageCount: number
  active: boolean
  startsOn: string
  endsOn: string
  products: Array<{ id: string, name: string }>
  categories: Array<{ id: string, name: string }>
}

const query = reactive({ page: 1, pageSize: 10, search: '' })
const { data: me } = await useFetch<{ data: { permissions: string[] } | null }>('/api/auth/me')
const { data, refresh, pending } = await useFetch<{ data: PromotionRow[], meta: { total: number, pageSize: number } }>('/api/admin/promotions', { query })
const { data: products } = await useFetch<{ data: Array<{ id: string, name: string }> }>('/api/admin/products', { query: { pageSize: 100, status: 'ACTIVE', sort: 'name', dir: 'asc' } })
const { data: categories } = await useFetch<{ data: Array<{ id: string, name: string, isActive: boolean }> }>('/api/admin/categories', { query: { pageSize: 100, sort: 'name', dir: 'asc' } })
watch(() => query.search, () => {
  if (query.page !== 1) query.page = 1
})

const open = ref(false)
const editing = ref<PromotionRow | null>(null)
const form = reactive({
  name: '',
  code: '',
  type: 'PERCENTAGE' as PromotionRow['type'],
  value: '10',
  minimumOrder: '0',
  usageLimit: '',
  startsOn: '',
  endsOn: '',
  applies: 'ALL' as 'ALL' | 'PRODUCTS' | 'CATEGORIES',
  productIds: [] as string[],
  categoryIds: [] as string[]
})
const toast = useToast()
const error = ref('')
const saving = ref(false)
const removing = ref<PromotionRow | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)
const canManage = computed(() => me.value?.data?.permissions.includes('promotion.manage') ?? false)
const productOptions = computed(() => (products.value?.data ?? []).map(product => ({ label: product.name, value: product.id })))
const categoryOptions = computed(() => (categories.value?.data ?? []).filter(category => category.isActive).map(category => ({ label: category.name, value: category.id })))
const appliesOptions = [
  { label: 'All products', value: 'ALL' },
  { label: 'Selected products', value: 'PRODUCTS' },
  { label: 'Selected categories', value: 'CATEGORIES' }
]
const typeOptions = [
  { label: 'Percentage', value: 'PERCENTAGE' },
  { label: 'Fixed amount', value: 'FIXED_AMOUNT' },
  { label: 'Free delivery', value: 'FREE_DELIVERY' }
]
const columns: TableColumn<PromotionRow>[] = [
  { id: 'sn', header: 'SN' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'code', header: 'Code' },
  { id: 'offer', header: 'Offer' },
  { id: 'applies', header: 'Applies to' },
  { id: 'dates', header: 'Dates' },
  { id: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

function notify(title: string, color: 'success' | 'error' = 'success') {
  toast.add({ title, color })
}

function message(caught: unknown, fallback: string) {
  if (caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data) {
    return String(caught.data.statusMessage)
  }
  return fallback
}

function amountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replaceAll('.', '')}`
}

function codeInput(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)
}

function offerLabel(row: PromotionRow) {
  if (row.type === 'FREE_DELIVERY') return 'Free delivery'
  if (row.type === 'PERCENTAGE') return `${Number(row.value)}% off`
  return `${Number(row.value)} off`
}

function appliesLabel(row: PromotionRow) {
  if (row.products.length) return row.products.map(product => product.name).join(', ')
  if (row.categories.length) return row.categories.map(category => category.name).join(', ')
  return 'All products'
}

function serial(index: number) {
  return (query.page - 1) * query.pageSize + index + 1
}

function resetForm() {
  form.name = ''
  form.code = ''
  form.type = 'PERCENTAGE'
  form.value = '10'
  form.minimumOrder = '0'
  form.usageLimit = ''
  form.startsOn = ''
  form.endsOn = ''
  form.applies = 'ALL'
  form.productIds = []
  form.categoryIds = []
}

function openAdd() {
  editing.value = null
  error.value = ''
  resetForm()
  open.value = true
}

function openEdit(row: PromotionRow) {
  editing.value = row
  error.value = ''
  form.name = row.name
  form.code = row.code ?? ''
  form.type = row.type
  form.value = row.type === 'FREE_DELIVERY' ? '0' : String(Number(row.value))
  form.minimumOrder = String(Number(row.minimumOrder))
  form.usageLimit = row.usageLimit === null ? '' : String(row.usageLimit)
  form.startsOn = row.startsOn
  form.endsOn = row.endsOn
  form.productIds = row.products.map(product => product.id)
  form.categoryIds = row.categories.map(category => category.id)
  if (row.products.length) form.applies = 'PRODUCTS'
  else if (row.categories.length) form.applies = 'CATEGORIES'
  else form.applies = 'ALL'
  open.value = true
}

async function save() {
  error.value = ''
  if (form.name.trim().length < 2) {
    error.value = 'Enter the promotion name.'
    return
  }
  if (!/^[A-Z0-9]{3,20}$/.test(form.code)) {
    error.value = 'Use 3 to 20 letters or numbers for the code.'
    return
  }
  if (!form.startsOn || !form.endsOn || form.endsOn < form.startsOn) {
    error.value = 'The end date has to be on or after the start date.'
    return
  }
  const value = form.type === 'FREE_DELIVERY' ? 0 : Number(form.value)
  if (form.type === 'PERCENTAGE' && (!Number.isFinite(value) || value <= 0 || value > 100)) {
    error.value = 'Enter a percentage from 1 to 100.'
    return
  }
  if (form.type === 'FIXED_AMOUNT' && (!Number.isFinite(value) || value <= 0)) {
    error.value = 'Enter an amount greater than zero.'
    return
  }
  const minimumOrder = form.minimumOrder === '' ? 0 : Number(form.minimumOrder)
  if (!Number.isFinite(minimumOrder) || minimumOrder < 0) {
    error.value = 'Enter a minimum order of zero or more.'
    return
  }
  const productIds = form.type !== 'FREE_DELIVERY' && form.applies === 'PRODUCTS' ? form.productIds : []
  const categoryIds = form.type !== 'FREE_DELIVERY' && form.applies === 'CATEGORIES' ? form.categoryIds : []
  if (form.type !== 'FREE_DELIVERY' && form.applies === 'PRODUCTS' && !productIds.length) {
    error.value = 'Choose a product.'
    return
  }
  if (form.type !== 'FREE_DELIVERY' && form.applies === 'CATEGORIES' && !categoryIds.length) {
    error.value = 'Choose a category.'
    return
  }
  const usageLimit = form.usageLimit === '' ? null : Number(form.usageLimit)
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 1)) {
    error.value = 'Enter a usage limit of at least 1, or leave it empty.'
    return
  }
  saving.value = true
  const body = {
    name: form.name.trim(),
    type: form.type,
    value,
    code: form.code,
    startsOn: form.startsOn,
    endsOn: form.endsOn,
    minimumOrder,
    usageLimit,
    productIds,
    categoryIds
  }
  try {
    if (editing.value) {
      await $fetch(`/api/admin/promotions/${editing.value.id}`, { method: 'PATCH', body })
      notify('Promotion updated.')
    } else {
      await $fetch('/api/admin/promotions', { method: 'POST', body })
      notify('Promotion saved.')
    }
    open.value = false
    await refresh()
  } catch (caught) {
    error.value = message(caught, 'Could not save the promotion.')
    notify(error.value, 'error')
  } finally {
    saving.value = false
  }
}

async function archive(row: PromotionRow) {
  try {
    await $fetch(`/api/admin/promotions/${row.id}`, { method: 'PATCH', body: { active: !row.active } })
    notify(row.active ? 'Promotion archived.' : 'Promotion restored.')
    await refresh()
  } catch (caught) {
    notify(message(caught, 'Could not update the promotion.'), 'error')
  }
}

function askDelete(row: PromotionRow) {
  removing.value = row
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!removing.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/promotions/${removing.value.id}`, { method: 'DELETE' })
    notify('Promotion deleted.')
    confirmOpen.value = false
    await refresh()
  } catch (caught) {
    notify(message(caught, 'Could not delete the promotion.'), 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Promotions">
      <UInput
        v-model="query.search"
        icon="i-lucide-search"
        placeholder="Search promotions"
        aria-label="Search promotions"
        class="w-full sm:w-64"
      />
      <UButton
        v-if="canManage"
        icon="i-lucide-plus"
        @click="openAdd"
      >
        Add
      </UButton>
    </PageHeader>
    <LoadingSkeleton v-if="pending && !data" />
    <div
      v-else-if="data?.data.length"
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
        <template #name-cell="{ row }">
          <span class="font-medium">{{ row.original.name }}</span>
        </template>
        <template #code-cell="{ row }">
          {{ row.original.code || 'n/a' }}
        </template>
        <template #offer-cell="{ row }">
          {{ offerLabel(row.original) }}
        </template>
        <template #applies-cell="{ row }">
          {{ appliesLabel(row.original) }}
        </template>
        <template #dates-cell="{ row }">
          {{ row.original.startsOn }} to {{ row.original.endsOn }}
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.active ? 'ACTIVE' : 'INACTIVE'" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip
              v-if="canManage"
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
              v-if="canManage"
              :text="row.original.active ? 'Archive' : 'Restore'"
            >
              <UButton
                :icon="row.original.active ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
                color="neutral"
                variant="soft"
                size="sm"
                :aria-label="row.original.active ? 'Archive' : 'Restore'"
                @click="archive(row.original)"
              />
            </UTooltip>
            <UTooltip
              v-if="canManage"
              text="Delete"
            >
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="soft"
                size="sm"
                aria-label="Delete"
                @click="askDelete(row.original)"
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
      icon="i-lucide-ticket"
      title="No promotions yet"
      :description="query.search ? 'Try a different name or code.' : 'Promotions you add will show up here.'"
      :action="!query.search && canManage ? 'Add' : undefined"
      @action="openAdd"
    />
    <ConfirmDelete
      v-model:open="confirmOpen"
      noun="promotion"
      :loading="deleting"
      @confirm="confirmDelete"
    />
    <FormModal
      v-model:open="open"
      form-id="promotion-form"
      :title="editing ? 'Edit promotion' : 'Add promotion'"
      :saving="saving"
      wide
      @submit="save"
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
      <UFormField
        label="Code"
        required
      >
        <UInput
          :model-value="form.code"
          class="w-full"
          @update:model-value="form.code = codeInput(String($event ?? ''))"
        />
      </UFormField>
      <UFormField
        label="Type"
        required
      >
        <USelect
          v-model="form.type"
          :items="typeOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="form.type !== 'FREE_DELIVERY'"
        label="Applies to"
        class="sm:col-span-2"
      >
        <USelect
          v-model="form.applies"
          :items="appliesOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="form.type !== 'FREE_DELIVERY' && form.applies === 'PRODUCTS'"
        label="Products"
        required
        class="sm:col-span-2"
      >
        <USelect
          v-model="form.productIds"
          :items="productOptions"
          multiple
          placeholder="Choose products"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="form.type !== 'FREE_DELIVERY' && form.applies === 'CATEGORIES'"
        label="Categories"
        required
        class="sm:col-span-2"
      >
        <USelect
          v-model="form.categoryIds"
          :items="categoryOptions"
          multiple
          placeholder="Choose categories"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="form.type !== 'FREE_DELIVERY'"
        :label="form.type === 'PERCENTAGE' ? 'Percentage' : 'Amount'"
        required
      >
        <UInput
          :model-value="form.value"
          inputmode="decimal"
          class="w-full"
          @update:model-value="form.value = amountInput(String($event ?? ''))"
        >
          <template
            v-if="form.type === 'PERCENTAGE'"
            #trailing
          >
            <span class="text-sm text-ink-muted">%</span>
          </template>
        </UInput>
      </UFormField>
      <UFormField label="Minimum order (RS)">
        <UInput
          :model-value="form.minimumOrder"
          inputmode="decimal"
          class="w-full"
          @update:model-value="form.minimumOrder = amountInput(String($event ?? ''))"
          @blur="form.minimumOrder = form.minimumOrder === '' ? '0' : form.minimumOrder"
        />
      </UFormField>
      <UFormField label="Usage limit">
        <UInput
          :model-value="form.usageLimit"
          inputmode="numeric"
          class="w-full"
          placeholder="Unlimited"
          @update:model-value="form.usageLimit = String($event ?? '').replace(/\D/g, '')"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-x-5 sm:col-span-2">
        <UFormField
          label="Starts"
          required
        >
          <UInput
            v-model="form.startsOn"
            type="date"
            class="w-full"
            required
          />
        </UFormField>
        <UFormField
          label="Ends"
          required
        >
          <UInput
            v-model="form.endsOn"
            type="date"
            class="w-full"
            required
          />
        </UFormField>
      </div>
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
