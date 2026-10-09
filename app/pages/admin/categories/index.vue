<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

type CategoryRow = {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  image: string | null
  products: number
}

const query = reactive({ page: 1, pageSize: 10, search: '' })
const { data: me } = await useFetch<{ data: { permissions: string[] } | null }>('/api/auth/me')
const { data, refresh, pending } = await useFetch<{ data: CategoryRow[], meta: { total: number, pageSize: number } }>('/api/admin/categories', { query })
watch(() => query.search, () => {
  if (query.page !== 1) query.page = 1
})

const open = ref(false)
const editing = ref<CategoryRow | null>(null)
const image = ref<File | null>(null)
const currentImage = ref<string | null>(null)
const clearImage = ref(false)
const form = reactive({ name: '', description: '', sortOrder: 0 })
const toast = useToast()
const error = ref('')
const saving = ref(false)
const removing = ref<CategoryRow | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)
const canCreate = computed(() => me.value?.data?.permissions.includes('category.create') ?? false)
const canUpdate = computed(() => me.value?.data?.permissions.includes('category.update') ?? false)
const canDelete = computed(() => me.value?.data?.permissions.includes('category.delete') ?? false)
const columns: TableColumn<CategoryRow>[] = [
  { id: 'sn', header: 'SN' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'products', header: 'Products' },
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
  form.description = ''
  form.sortOrder = 0
  open.value = true
}

function openEdit(category: CategoryRow) {
  editing.value = category
  error.value = ''
  resetImage(category.image)
  form.name = category.name
  form.description = category.description ?? ''
  form.sortOrder = category.sortOrder
  open.value = true
}

function serial(index: number) {
  return (query.page - 1) * query.pageSize + index + 1
}

async function save() {
  error.value = ''
  saving.value = true
  const body = {
    name: form.name,
    description: form.description || null,
    sortOrder: form.sortOrder || 0
  }
  const updating = Boolean(editing.value)
  let id = editing.value?.id
  try {
    if (id) {
      await $fetch(`/api/admin/categories/${id}`, { method: 'PATCH', body })
    } else {
      const created = await $fetch<{ data: { id: string } }>('/api/admin/categories', { method: 'POST', body })
      id = created.data.id
      editing.value = {
        id,
        name: form.name,
        description: form.description || null,
        sortOrder: form.sortOrder || 0,
        isActive: true,
        image: currentImage.value,
        products: 0
      }
    }
    if (image.value && id) {
      const file = new FormData()
      file.append('image', image.value)
      await $fetch(`/api/admin/categories/${id}/image`, { method: 'POST', body: file })
    } else if (clearImage.value && id) {
      await $fetch(`/api/admin/categories/${id}/image`, { method: 'DELETE' })
    }
    notify(updating ? 'Category updated.' : 'Category saved.')
    open.value = false
    await refresh()
  } catch (caught) {
    error.value = message(caught, id && !updating ? 'The category was saved, but the image was not.' : 'Could not save the category.')
    notify(error.value, 'error')
    await refresh()
  } finally {
    saving.value = false
  }
}

async function archive(category: CategoryRow) {
  try {
    await $fetch(`/api/admin/categories/${category.id}`, {
      method: 'PATCH',
      body: { isActive: !category.isActive }
    })
    notify(category.isActive ? 'Category archived.' : 'Category restored.')
    await refresh()
  } catch (caught) {
    notify(message(caught, 'Could not update the category.'), 'error')
  }
}

function askDelete(category: CategoryRow) {
  removing.value = category
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!removing.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/categories/${removing.value.id}`, { method: 'DELETE' })
    notify('Category deleted.')
    confirmOpen.value = false
    await refresh()
  } catch (caught) {
    notify(message(caught, 'Could not delete the category.'), 'error')
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Categories">
      <UInput
        v-model="query.search"
        icon="i-lucide-search"
        placeholder="Search categories"
        aria-label="Search categories"
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
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <img
              v-if="row.original.image"
              :src="row.original.image"
              alt=""
              class="size-10 rounded-md object-cover"
            >
            <span
              v-else
              class="grid size-10 place-items-center rounded-md bg-canvas text-ink-muted"
            >
              <UIcon
                name="i-lucide-folder"
                class="size-5"
              />
            </span>
            <span class="font-medium">{{ row.original.name }}</span>
          </div>
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.isActive ? 'ACTIVE' : 'INACTIVE'" />
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
              :text="row.original.isActive ? 'Archive' : 'Restore'"
            >
              <UButton
                :icon="row.original.isActive ? 'i-lucide-archive' : 'i-lucide-archive-restore'"
                color="neutral"
                variant="soft"
                size="sm"
                :aria-label="row.original.isActive ? 'Archive' : 'Restore'"
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
      icon="i-lucide-folder"
      title="No categories yet"
      :description="query.search ? 'Try a different name.' : 'Categories you add will show up here.'"
      :action="!query.search && canCreate ? 'Add' : undefined"
      @action="openAdd"
    />
    <ConfirmDelete
      v-model:open="confirmOpen"
      noun="category"
      :loading="deleting"
      @confirm="confirmDelete"
    />
    <FormModal
      v-model:open="open"
      form-id="category-form"
      :title="editing ? 'Edit category' : 'Add category'"
      :saving="saving"
      @submit="save"
    >
      <UFormField label="Image">
        <ImageField
          v-model:file="image"
          v-model:current="currentImage"
          v-model:clear="clearImage"
          label="Category photo"
        />
      </UFormField>
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
      <UFormField label="Description">
        <UTextarea
          v-model="form.description"
          :rows="3"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Sort order">
        <UInputNumber
          v-model="form.sortOrder"
          :min="0"
          class="w-full"
        />
      </UFormField>
      <p
        v-if="error"
        class="text-sm text-danger-600"
        role="alert"
      >
        {{ error }}
      </p>
    </FormModal>
  </section>
</template>
