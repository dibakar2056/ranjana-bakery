<script setup lang="ts">
import { canDeleteUser, canManageUser, type RoleKey } from '~~/shared/domain/rbac'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

type UserRow = {
  id: string
  username: string
  email: string
  displayName: string
  phone: string | null
  status: string
  roles: string[]
}

const { data: me } = await useFetch<{ data: { id: string, permissions: string[], roles: string[] } | null }>('/api/auth/me')
const query = reactive({ page: 1, search: '' })
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

function resetForm() {
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
  try {
    if (editing.value) {
      await $fetch(`/api/admin/users/${editing.value.id}`, {
        method: 'PATCH',
        body: {
          displayName: form.displayName,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          status: form.status
        }
      })
      notify('User updated.')
    } else {
      await $fetch('/api/admin/users', {
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
      notify('Invitation sent. The temporary password is only in the email.')
    }
    open.value = false
    await refresh()
  } catch (caught) {
    error.value = caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data
      ? String(caught.data.statusMessage)
      : 'Could not save the user.'
    notify(error.value, 'error')
  } finally {
    saving.value = false
  }
}

const rows = computed(() => data.value?.data ?? [])

function serial(index: number) {
  const size = data.value?.meta.pageSize ?? 20
  return (query.page - 1) * size + index + 1
}

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
        color="neutral"
        variant="outline"
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
      <div class="overflow-x-auto">
        <table class="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col class="w-10">
            <col class="w-72">
            <col class="w-40">
            <col class="w-28">
            <col class="w-60">
            <col class="w-24">
            <col class="w-24">
            <col>
            <col class="w-28">
          </colgroup>
          <thead>
            <tr class="border-b border-line bg-canvas/70 text-xs font-medium tracking-wide text-ink-muted uppercase">
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                SN
              </th>
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                Name
              </th>
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                Username
              </th>
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                Role
              </th>
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                Email
              </th>
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                Phone
              </th>
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                Status
              </th>
              <th
                class="w-full p-0"
                aria-hidden="true"
              />
              <th class="px-3 py-2.5 font-medium whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(user, index) in rows"
              :key="user.id"
              class="border-b border-line transition-colors duration-200 last:border-b-0 hover:bg-brand-50/50"
              :class="isSelf(user) ? 'bg-brand-50/30' : ''"
            >
              <td class="px-3 py-3 align-middle text-sm text-ink-muted">
                {{ serial(index) }}
              </td>
              <td class="px-3 py-3 align-middle">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                    {{ user.displayName.slice(0, 1) }}
                  </span>
                  <p class="flex min-w-0 items-center gap-2 font-medium text-ink">
                    <span class="truncate">{{ user.displayName }}</span>
                    <span
                      v-if="isSelf(user)"
                      class="shrink-0 rounded-md bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium tracking-wide text-brand-800 uppercase"
                    >You</span>
                  </p>
                </div>
              </td>
              <td class="px-3 py-3 align-middle text-sm text-ink">
                <div class="flex min-w-0 items-center gap-1">
                  <p class="truncate">
                    {{ user.username }}
                  </p>
                  <UTooltip text="Copy username">
                    <UButton
                      icon="i-lucide-copy"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      class="shrink-0"
                      aria-label="Copy username"
                      @click="copyUsername(user.username)"
                    />
                  </UTooltip>
                </div>
              </td>
              <td class="px-3 py-3 align-middle">
                <span class="inline-flex max-w-full rounded-md bg-brand-50 px-2 py-1 text-xs font-medium whitespace-nowrap text-brand-800">
                  {{ user.roles.map(roleLabel).join(', ') }}
                </span>
              </td>
              <td class="px-3 py-3 align-middle text-sm">
                <p class="truncate text-ink">
                  {{ user.email }}
                </p>
              </td>
              <td class="px-3 py-3 align-middle text-sm text-ink">
                <p class="truncate">
                  {{ user.phone || '—' }}
                </p>
              </td>
              <td class="px-3 py-3 align-middle">
                <StatusBadge :status="user.status" />
              </td>
              <td
                class="p-0"
                aria-hidden="true"
              />
              <td class="px-3 py-3 align-middle">
                <div
                  v-if="manageable(user) || removable(user)"
                  class="flex items-center gap-1"
                >
                  <UTooltip
                    v-if="manageable(user)"
                    text="Edit"
                  >
                    <UButton
                      icon="i-lucide-pencil"
                      color="primary"
                      variant="soft"
                      size="sm"
                      class="rounded-lg transition-colors duration-200 hover:bg-brand-100"
                      aria-label="Edit"
                      @click="openEdit(user)"
                    />
                  </UTooltip>
                  <UTooltip
                    v-if="manageable(user) && !isSelf(user)"
                    :text="user.status === 'DISABLED' ? 'Activate' : 'Disable'"
                  >
                    <UButton
                      :icon="user.status === 'DISABLED' ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                      color="neutral"
                      variant="soft"
                      size="sm"
                      class="rounded-lg"
                      :aria-label="user.status === 'DISABLED' ? 'Activate' : 'Disable'"
                      @click="setStatus(user)"
                    />
                  </UTooltip>
                  <UTooltip
                    v-if="removable(user)"
                    text="Delete"
                  >
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="soft"
                      size="sm"
                      class="rounded-lg"
                      aria-label="Delete"
                      @click="askDelete(user)"
                    />
                  </UTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 pb-4">
        <ListPagination
          v-if="data?.meta"
          v-model:page="query.page"
          :total="data.meta.total"
          :page-size="data.meta.pageSize"
        />
      </div>
    </div>
    <UModal
      v-model:open="confirmOpen"
      title="Delete user"
    >
      <template #body>
        <p class="text-sm text-ink">
          Delete {{ removing?.displayName }}? Their sign-in will stop, and this cannot be undone.
        </p>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          @click="confirmOpen = false"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          :loading="deleting"
          @click="confirmDelete"
        >
          Delete
        </UButton>
      </template>
    </UModal>
    <UModal
      v-model:open="open"
      :title="editing ? 'Edit user' : 'Add user'"
    >
      <template #body>
        <form
          id="user-form"
          class="grid gap-3 sm:grid-cols-2"
          @submit.prevent="saveUser"
        >
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
        </form>
      </template>
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          @click="open = false"
        >
          Cancel
        </UButton>
        <UButton
          type="submit"
          form="user-form"
          :loading="saving"
        >
          Save
        </UButton>
      </template>
    </UModal>
  </section>
</template>
