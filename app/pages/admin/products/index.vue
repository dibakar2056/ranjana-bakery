<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

type ProductRow = {
  id: string
  sku: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  price: string
  quantity: number
  image: string | null
  ingredients: string
  status: string
}

const query = reactive({ page: 1, pageSize: 10, search: '' })
const { data: me } = await useFetch<{ data: { permissions: string[] } | null }>('/api/auth/me')
const { data, refresh, pending } = await useFetch<{ data: ProductRow[], meta: { total: number, pageSize: number } }>('/api/admin/products', { query })
const { data: categories } = await useFetch<{ data: Array<{ id: string, name: string }> }>('/api/admin/categories', {
  query: { pageSize: 100 }
})
watch(() => query.search, () => {
  if (query.page !== 1) query.page = 1
})

const open = ref(false)
const editing = ref<ProductRow | null>(null)
const image = ref<File | null>(null)
const currentImage = ref<string | null>(null)
const clearImage = ref(false)
const form = reactive({
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  price: '',
  ingredients: [] as string[],
  status: 'DRAFT'
})
const statusOptions = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Archived', value: 'ARCHIVED' }
]
const toast = useToast()
const error = ref('')
const saving = ref(false)
const removing = ref<ProductRow | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)
const canCreate = computed(() => me.value?.data?.permissions.includes('product.create') ?? false)
const canUpdate = computed(() => me.value?.data?.permissions.includes('product.update') ?? false)
const canDelete = computed(() => me.value?.data?.permissions.includes('product.delete') ?? false)
const categoryOptions = computed(() => (categories.value?.data ?? []).map(category => ({ label: category.name, value: category.id })))
const columns: TableColumn<ProductRow>[] = [
  { id: 'sn', header: 'SN' },
  { id: 'product', header: 'Product' },
  { accessorKey: 'categoryName', header: 'Category' },
  { accessorKey: 'quantity', header: 'Qty' },
  { accessorKey: 'price', header: 'Price' },
  { accessorKey: 'status', header: 'Status' },
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

function resetImage(url: string | null) {
  image.value = null
  currentImage.value = url
  clearImage.value = false
}

function openAdd() {
  editing.value = null
  error.value = ''
  resetImage(null)
  form.name = ''
  form.sku = ''
  form.description = ''
  form.categoryId = categoryOptions.value[0]?.value ?? ''
  form.price = ''
  form.ingredients = []
  form.status = 'DRAFT'
  open.value = true
}

function openEdit(product: ProductRow) {
  editing.value = product
  error.value = ''
  resetImage(product.image)
  form.name = product.name
  form.sku = product.sku
  form.description = product.description
  form.categoryId = product.categoryId
  form.price = product.price
  form.ingredients = product.ingredients.split(',').map(part => part.trim()).filter(Boolean)
  form.status = product.status
  open.value = true
}

function serial(index: number) {
  const size = data.value?.meta.pageSize ?? query.pageSize
  return (query.page - 1) * size + index + 1
}

function priceLabel(value: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

async function archive(product: ProductRow) {
  const status = product.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED'
  try {
    await $fetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { status } })
    notify(status === 'ARCHIVED' ? 'Product archived.' : 'Product restored.')
    await refresh()
  } catch (caught) {
    notify(message(caught, 'Could not update the product.'), 'error')
  }
}

function askDelete(product: ProductRow) {
  removing.value = product
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!removing.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/products/${removing.value.id}`, { method: 'DELETE' })
    notify('Product deleted.')
    confirmOpen.value = false
    await refresh()
  } catch (caught) {
    notify(message(caught, 'Could not delete the product.'), 'error')
  } finally {
    deleting.value = false
  }
}

async function save() {
  error.value = ''
  const price = Number(form.price)
  if (!Number.isFinite(price) || price <= 0) {
    error.value = 'Enter a price.'
    notify(error.value, 'error')
    return
  }
  saving.value = true
  const body = {
    name: form.name,
    sku: form.sku,
    description: form.description,
    categoryId: form.categoryId,
    price,
    ingredients: form.ingredients.join(', '),
    status: form.status
  }
  const updating = Boolean(editing.value)
  let id = editing.value?.id
  try {
    if (id) {
      await $fetch(`/api/admin/products/${id}`, { method: 'PATCH', body })
    } else {
      const created = await $fetch<{ data: { id: string } }>('/api/admin/products', { method: 'POST', body })
      id = created.data.id
      editing.value = {
        id,
        sku: form.sku,
        name: form.name,
        description: form.description,
        categoryId: form.categoryId,
        categoryName: '',
        price: String(price),
        quantity: 0,
        image: currentImage.value,
        ingredients: form.ingredients.join(', '),
        status: form.status
      }
    }
    if (image.value && id) {
      const file = new FormData()
      file.append('image', image.value)
      await $fetch(`/api/admin/products/${id}/image`, { method: 'POST', body: file })
    } else if (clearImage.value && id) {
      await $fetch(`/api/admin/products/${id}/image`, { method: 'DELETE' })
    }
    notify(updating ? 'Product updated.' : 'Product saved.')
    open.value = false
    await refresh()
  } catch (caught) {
    error.value = message(caught, id && !updating ? 'The product was saved, but the image was not.' : 'Could not save the product.')
    notify(error.value, 'error')
    await refresh()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Products">
      <UInput
        v-model="query.search"
        icon="i-lucide-search"
        placeholder="Search name or SKU"
        aria-label="Search products"
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
        <template #product-cell="{ row }">
          <div class="flex items-center gap-3">
            <img
              v-if="row.original.image"
              :src="row.original.image"
              :alt="row.original.name"
              class="h-10 w-10 rounded-md object-cover shadow"
            >
            <span
              v-else
              class="flex h-10 w-10 items-center justify-center rounded-md bg-canvas text-ink-muted shadow"
            >
              <UIcon
                name="i-lucide-cake"
                class="size-5"
              />
            </span>
            <div class="flex min-w-0 flex-col">
              <span class="truncate font-medium text-ink">{{ row.original.name }}</span>
              <span class="truncate text-xs text-ink-muted">{{ row.original.sku }}</span>
            </div>
          </div>
        </template>
        <template #categoryName-cell="{ row }">
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ row.original.categoryName }}
          </UBadge>
        </template>
        <template #price-cell="{ row }">
          <span class="font-medium">{{ priceLabel(row.original.price) }}</span>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
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
              :text="row.original.status === 'ARCHIVED' ? 'Restore' : 'Archive'"
            >
              <UButton
                :icon="row.original.status === 'ARCHIVED' ? 'i-lucide-archive-restore' : 'i-lucide-archive'"
                color="neutral"
                variant="soft"
                size="sm"
                :aria-label="row.original.status === 'ARCHIVED' ? 'Restore' : 'Archive'"
                @click="archive(row.original)"
              />
            </UTooltip>
            <UTooltip
              v-if="canDelete"
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
      icon="i-lucide-cake"
      title="No products yet"
      :description="query.search ? 'Try a different name or SKU.' : 'Products you add will show up here.'"
      :action="!query.search && canCreate ? 'Add' : undefined"
      @action="openAdd"
    />
    <ConfirmDelete
      v-model:open="confirmOpen"
      noun="product"
      :loading="deleting"
      @confirm="confirmDelete"
    />
    <FormModal
      v-model:open="open"
      wide
      form-id="product-form"
      :title="editing ? 'Edit product' : 'Add product'"
      :saving="saving"
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
        label="Category"
        required
      >
        <USelect
          :key="`category-${editing?.id ?? 'new'}`"
          v-model="form.categoryId"
          :items="categoryOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Price"
        required
      >
        <UInput
          v-model="form.price"
          type="number"
          min="0"
          step="0.01"
          class="w-full"
          required
        />
      </UFormField>
      <UFormField label="Status">
        <USelect
          :key="`status-${editing?.id ?? 'new'}`"
          v-model="form.status"
          :items="statusOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="SKU"
        class="sm:col-span-2"
      >
        <UInput
          v-model="form.sku"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Ingredients"
        class="sm:col-span-2"
      >
        <UInputTags
          v-model="form.ingredients"
          delimiter=","
          class="w-full"
          @keydown.enter.stop
        />
      </UFormField>
      <UFormField label="Image">
        <ImageField
          v-model:file="image"
          v-model:current="currentImage"
          v-model:clear="clearImage"
          label="Product photo"
        />
      </UFormField>
      <UFormField
        label="Description"
        required
      >
        <UTextarea
          v-model="form.description"
          :rows="6"
          class="w-full"
          :ui="{ base: 'h-44' }"
          required
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
