<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { canDeleteUser, canManageUser, type RoleKey } from '~~/shared/domain/rbac'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

type UserRow = {
  id: string
  username: string
  email: string
  displayName: string
  phone: string | null
  image: string | null
  status: string
  roles: string[]
}

const { data: me } = await useFetch<{ data: { id: string, permissions: string[], roles: string[] } | null }>('/api/auth/me')
const query = reactive({ page: 1, pageSize: 5, search: '' })
const { data, refresh, pending } = await useFetch<{ data: UserRow[], meta: { total: number, pageSize: number } }>('/api/admin/users', {
  query
})
watch(() => query.search, () => {
  if (query.page !== 1) query.page = 1
})
const open = ref(false)
const editing = ref<UserRow | null>(null)
const removing = ref<UserRow | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)
const image = ref<File | null>(null)
const currentImage = ref<string | null>(null)
const clearImage = ref(false)
const form = reactive({ displayName: '', username: '', email: '', phone: '', role: 'STAFF', status: 'INVITED' })
const statusOptions = [
  { label: 'Invited', value: 'INVITED' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'DISABLED' }
]
const toast = useToast()
const error = ref('')
const saving = ref(false)

function notify(title: string, color: 'success' | 'error' = 'success') {
  toast.add({ title, color })
}

function copyUsername(username: string) {
  const input = document.createElement('textarea')
  input.value = username
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.focus()
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (copied) {
    notify('Username copied')
    return
  }
  navigator.clipboard.writeText(username).then(
    () => notify('Username copied'),
    () => notify('Could not copy username', 'error')
  )
}

const canCreate = computed(() => me.value?.data?.permissions.includes('user.create') ?? false)
const canUpdate = computed(() => me.value?.data?.permissions.includes('user.update') ?? false)

function actorRoles() {
  return (me.value?.data?.roles ?? []) as RoleKey[]
}

function manageable(user: UserRow) {
  return canUpdate.value && canManageUser(actorRoles(), user.roles as RoleKey[])
}

function removable(user: UserRow) {
  return canUpdate.value && user.id !== me.value?.data?.id && canDeleteUser(actorRoles(), user.roles as RoleKey[])
}
const assignableRoles = computed(() => {
  const roles = me.value?.data?.roles ?? []
  if (roles.includes('SUPER_ADMIN')) return ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'USER']
  if (roles.includes('ADMIN')) return ['STAFF', 'USER']
  return []
})
const roleItems = computed(() => {
  const keys = [...assignableRoles.value]
  const current = editing.value?.roles[0]
  if (current && !keys.includes(current)) keys.unshift(current)
  return keys.map(role => ({ label: role.replaceAll('_', ' '), value: role }))
})

function resetImage(url: string | null) {
  image.value = null
  currentImage.value = url
  clearImage.value = false
}

function resetForm() {
  resetImage(null)
  form.displayName = ''
  form.username = ''
  form.email = ''
  form.phone = ''
  form.role = assignableRoles.value.includes('STAFF') ? 'STAFF' : (assignableRoles.value[0] ?? 'USER')
  form.status = 'INVITED'
}

function openAdd() {
  editing.value = null
  error.value = ''
  resetForm()
  open.value = true
}

function openEdit(user: UserRow) {
  editing.value = user
  error.value = ''
  resetImage(user.image)
  form.displayName = user.displayName
  form.username = user.username
  form.email = user.email
  form.phone = user.phone ?? ''
  form.role = user.roles[0] ?? 'STAFF'
  form.status = user.status
  open.value = true
}

async function saveUser() {
  error.value = ''
  saving.value = true
  const updating = Boolean(editing.value)
  let id = editing.value?.id
  try {
    if (image.value && id) {
      const file = new FormData()
      file.append('image', image.value)
      await $fetch(`/api/admin/users/${id}/image`, { method: 'POST', body: file })
    } else if (clearImage.value && id) {
      await $fetch(`/api/admin/users/${id}/image`, { method: 'DELETE' })
    }
    if (id) {
      await $fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: {
          displayName: form.displayName,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          status: form.status
        }
      })
    } else {
      const created = await $fetch<{ data: UserRow }>('/api/admin/users', {
        method: 'POST',
        body: {
          displayName: form.displayName,
          username: form.username,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          status: form.status
        }
      })
      id = created.data.id
      editing.value = created.data
      if (image.value) {
        const file = new FormData()
        file.append('image', image.value)
        await $fetch(`/api/admin/users/${id}/image`, { method: 'POST', body: file })
      }
    }
    notify(updating ? 'User updated.' : 'Invitation sent. The temporary password is only in the email.')
    open.value = false
    await refresh()
  } catch (caught) {
    error.value = caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data
      ? String(caught.data.statusMessage)
      : id && !updating ? 'The user was saved, but the image was not.' : 'Could not save the user.'
    notify(error.value, 'error')
    await refresh()
  } finally {
    saving.value = false
  }
}

const rows = computed(() => data.value?.data ?? [])

function serial(index: number) {
  return (query.page - 1) * query.pageSize + index + 1
}

const columns: TableColumn<UserRow>[] = [
  { id: 'sn', header: 'SN' },
  { id: 'name', header: 'Name' },
  { id: 'username', header: 'Username' },
  { id: 'role', header: 'Role' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: 'Actions' }
]

function roleLabel(role: string) {
  return role.toLowerCase().split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function isSelf(user: UserRow) {
  return user.id === me.value?.data?.id
}

function askDelete(user: UserRow) {
  removing.value = user
  window.setTimeout(() => {
    confirmOpen.value = true
  }, 0)
}

async function confirmDelete() {
  if (!removing.value) return
  deleting.value = true
  try {
    await $fetch(`/api/admin/users/${removing.value.id}`, { method: 'DELETE' })
    notify('User deleted.')
    confirmOpen.value = false
    removing.value = null
    await refresh()
  } catch (caught) {
    const text = caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data
      ? String(caught.data.statusMessage)
      : 'Could not delete the user.'
    notify(text, 'error')
  } finally {
    deleting.value = false
  }
}

async function setStatus(user: UserRow) {
  error.value = ''
  try {
    const status = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED'
    await $fetch(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { status } })
    notify(status === 'DISABLED' ? 'User disabled.' : 'User activated.')
    await refresh()
  } catch (caught) {
    const text = caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data
      ? String(caught.data.statusMessage)
      : 'Could not change the user status.'
    notify(text, 'error')
  }
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Users">
      <UInput
        v-model="query.search"
        icon="i-lucide-search"
        placeholder="Search name, username, or email"
        aria-label="Search users"
        class="w-full sm:w-72"
      />
      <UButton
        v-if="canCreate"
        icon="i-lucide-plus"
        @click="openAdd"
      >
        Add
      </UButton>
    </PageHeader>
    <LoadingSkeleton v-if="pending && !rows.length" />
    <EmptyState
      v-else-if="!rows.length"
      icon="i-lucide-shield"
      :title="query.search ? 'No matching accounts' : 'No users yet'"
      :action="!query.search && canCreate ? 'Add' : undefined"
      :description="query.search ? 'Try a different name, username, or email.' : 'Staff accounts you invite will show up here.'"
      @action="openAdd"
    />
    <div
      v-else
      class="overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
    >
      <UTable
        :data="rows"
        :columns="columns"
        :loading="pending"
        :meta="{ class: { tr: row => isSelf(row.original) ? 'bg-brand-50/30' : '' } }"
        class="flex-1"
      >
        <template #sn-cell="{ row }">
          {{ serial(row.index) }}
        </template>
        <template #name-cell="{ row }">
          <div class="flex min-w-0 items-center gap-3">
            <img
              v-if="row.original.image"
              :src="row.original.image"
              alt=""
              class="size-10 shrink-0 rounded-full object-cover"
            >
            <span
              v-else
              class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white"
            >
              {{ row.original.displayName.slice(0, 1) }}
            </span>
            <p class="flex min-w-0 items-center gap-2 font-medium text-ink">
              <span class="truncate">{{ row.original.displayName }}</span>
              <span
                v-if="isSelf(row.original)"
                class="shrink-0 rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-brand-800 uppercase"
              >You</span>
            </p>
          </div>
        </template>
        <template #username-cell="{ row }">
          <div class="flex min-w-0 items-center gap-1">
            <p class="truncate">
              {{ row.original.username }}
            </p>
            <UTooltip text="Copy username">
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="ghost"
                size="xs"
                class="shrink-0"
                aria-label="Copy username"
                @click="copyUsername(row.original.username)"
              />
            </UTooltip>
          </div>
        </template>
        <template #role-cell="{ row }">
          <span class="inline-flex max-w-full rounded-md bg-brand-50 px-2 py-1 text-xs font-medium whitespace-nowrap text-brand-800">
            {{ row.original.roles.map(roleLabel).join(', ') }}
          </span>
        </template>
        <template #phone-cell="{ row }">
          {{ row.original.phone || '—' }}
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <div
            v-if="manageable(row.original) || removable(row.original)"
            class="flex items-center gap-1"
          >
            <UTooltip
              v-if="manageable(row.original)"
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
              v-if="manageable(row.original) && !isSelf(row.original)"
              :text="row.original.status === 'DISABLED' ? 'Activate' : 'Disable'"
            >
              <UButton
                :icon="row.original.status === 'DISABLED' ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                color="neutral"
                variant="soft"
                size="sm"
                :aria-label="row.original.status === 'DISABLED' ? 'Activate' : 'Disable'"
                @click="setStatus(row.original)"
              />
            </UTooltip>
            <UTooltip
              v-if="removable(row.original)"
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
        v-if="data?.meta"
        v-model:page="query.page"
        v-model:rows="query.pageSize"
        :total="data.meta.total"
      />
    </div>
    <ConfirmDelete
      v-model:open="confirmOpen"
      noun="user"
      message="Their sign-in will stop, and this cannot be undone."
      :loading="deleting"
      @confirm="confirmDelete"
    />
    <FormModal
      v-model:open="open"
      wide
      form-id="user-form"
      :title="editing ? 'Edit user' : 'Add user'"
      :saving="saving"
      @submit="saveUser"
    >
      <UFormField
        label="Photo"
        class="sm:col-span-2"
      >
        <ImageField
          v-model:file="image"
          v-model:current="currentImage"
          v-model:clear="clearImage"
          label="Profile photo"
        />
      </UFormField>
      <UFormField
        label="Name"
        required
      >
        <UInput
          v-model="form.displayName"
          class="w-full"
          required
        />
      </UFormField>
      <UFormField
        label="Username"
        required
      >
        <UInput
          v-model="form.username"
          class="w-full"
          required
          :disabled="Boolean(editing)"
        />
      </UFormField>
      <UFormField
        label="Email"
        required
      >
        <UInput
          v-model="form.email"
          type="email"
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
      <UFormField label="Role">
        <USelect
          :key="`role-${editing?.id ?? 'new'}`"
          v-model="form.role"
          :items="roleItems"
          class="w-full"
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
