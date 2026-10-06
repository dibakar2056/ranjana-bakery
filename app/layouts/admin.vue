<script setup lang="ts">
type Staff = { displayName: string, roles: string[], permissions: string[] }

const { data } = await useFetch<{ data: Staff | null }>('/api/auth/me')
const permissions = computed(() => data.value?.data?.permissions ?? [])
const displayName = computed(() => data.value?.data?.displayName ?? 'Staff')
const route = useRoute()
const menuOpen = ref(false)
const collapsed = ref(false)
const colorMode = useColorMode()
const dark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = dark.value ? 'light' : 'dark'
}
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')

function isCurrent(to: string) {
  if (to === '/admin') return route.path === '/admin'
  return route.path === to || route.path.startsWith(`${to}/`)
}

const groups = computed(() => {
  const sections = [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/admin' }]
    }
  ]
  if (permissions.value.includes('customer.read')) {
    sections.push({
      label: 'Customers',
      items: [{ label: 'Customers', icon: 'i-lucide-users', to: '/admin/customers' }]
    })
  }
  const admin = []
  if (permissions.value.includes('user.read')) admin.push({ label: 'Users', icon: 'i-lucide-shield', to: '/admin/users' })
  if (permissions.value.includes('audit.read')) admin.push({ label: 'Audit log', icon: 'i-lucide-scroll-text', to: '/admin/audit' })
  if (admin.length) sections.push({ label: 'Administration', items: admin })
  return sections
})

const crumbs = computed(() => {
  const items = [{ label: 'Dashboard', to: '/admin' }]
  if (route.path.startsWith('/admin/customers')) items.push({ label: 'Customers', to: '/admin/customers' })
  if (route.path.startsWith('/admin/customers/') && route.params.id) items.push({ label: 'Profile', to: route.path })
  if (route.path.startsWith('/admin/users')) items.push({ label: 'Users', to: '/admin/users' })
  if (route.path.startsWith('/admin/audit')) items.push({ label: 'Audit log', to: '/admin/audit' })
  return items.length > 1 ? items : [{ label: 'Dashboard', to: '/admin' }]
})

const accountItems = [[{
  label: 'Sign out',
  icon: 'i-lucide-log-out',
  onSelect: signOut
}]]

async function signOut() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}

async function submitSearch() {
  if (!permissions.value.includes('customer.read')) return
  const term = search.value.trim()
  await navigateTo({ path: '/admin/customers', query: term ? { search: term } : {} })
}
</script>

<template>
  <div class="flex min-h-svh bg-canvas text-ink">
    <aside
      class="sticky top-0 hidden h-svh shrink-0 border-r border-brand-800 bg-[#0f1c1c] transition-[width] duration-200 motion-reduce:transition-none lg:block"
      :class="collapsed ? 'w-[4.5rem]' : 'w-64'"
    >
      <AdminNav
        :groups="groups"
        :collapsed="collapsed"
        :current="isCurrent"
      />
    </aside>
    <USlideover
      v-model:open="menuOpen"
      side="left"
      title="Menu"
      description="Admin navigation"
      :close="{ variant: 'ghost', class: 'text-white hover:bg-white/10' }"
      :ui="{ content: 'bg-[#0f1c1c]', header: 'border-white/10', title: 'text-white', description: 'text-brand-200', body: 'bg-[#0f1c1c]' }"
    >
      <template #body>
        <AdminNav
          :groups="groups"
          :current="isCurrent"
          @navigate="menuOpen = false"
        />
      </template>
    </USlideover>
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-canvas/95 px-3 backdrop-blur sm:px-5">
        <UTooltip text="Menu">
          <UButton
            class="lg:hidden"
            color="neutral"
            variant="ghost"
            icon="i-lucide-menu"
            aria-label="Menu"
            @click="menuOpen = true"
          />
        </UTooltip>
        <UTooltip :text="collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <UButton
            class="hidden lg:inline-flex"
            color="neutral"
            variant="ghost"
            icon="i-lucide-panel-left"
            :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="collapsed = !collapsed"
          />
        </UTooltip>
        <nav
          aria-label="Breadcrumb"
          class="hidden min-w-0 items-center gap-1 text-sm sm:flex"
        >
          <template
            v-for="(crumb, index) in crumbs"
            :key="crumb.to"
          >
            <span
              v-if="index"
              class="text-ink-muted"
              aria-hidden="true"
            >/</span>
            <NuxtLink
              :to="crumb.to"
              class="truncate text-ink-muted hover:text-ink"
              :class="index === crumbs.length - 1 ? 'font-medium text-ink' : ''"
            >
              {{ crumb.label }}
            </NuxtLink>
          </template>
        </nav>
        <form
          v-if="permissions.includes('customer.read')"
          class="ml-auto hidden w-56 md:block"
          @submit.prevent="submitSearch"
        >
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search customers"
            aria-label="Search customers"
            color="neutral"
            variant="outline"
            size="sm"
            class="w-full"
          />
        </form>
        <div class="ml-auto flex items-center gap-1 md:ml-2">
          <UTooltip :text="dark ? 'Light mode' : 'Dark mode'">
            <UButton
              color="neutral"
              variant="ghost"
              :icon="dark ? 'i-lucide-sun' : 'i-lucide-moon'"
              :aria-label="dark ? 'Light mode' : 'Dark mode'"
              @click="toggleTheme"
            />
          </UTooltip>
          <UDropdownMenu :items="accountItems">
            <UButton
              color="neutral"
              variant="ghost"
              class="max-w-52"
            >
              <span class="grid size-7 place-items-center rounded-full bg-brand-700 text-xs text-white">
                {{ displayName.slice(0, 1) }}
              </span>
              <span class="hidden truncate text-sm font-medium text-ink sm:block">{{ displayName }}</span>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 text-ink-muted"
              />
            </UButton>
          </UDropdownMenu>
        </div>
      </header>
      <main class="flex-1">
        <slot />
      </main>
    </div>
  </div>
</template>
