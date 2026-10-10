<script setup lang="ts">
type StoreInfo = { name: string, phone: string, email: string, address: string, opens: string, closes: string }
type StoreCategory = { id: string, name: string, slug: string, image: string | null, products: number }

const route = useRoute()
const menuOpen = ref(false)
const departmentsOpen = ref(false)
const search = ref(typeof route.query.search === 'string' ? route.query.search : '')
const { data: store } = await useFetch<{ data: StoreInfo }>('/api/catalog/store')
const { data: categories } = await useFetch<{ data: StoreCategory[] }>('/api/catalog/categories')
const { data: session, refresh: refreshSession } = await useFetch<{ data: { displayName: string } | null }>('/api/auth/me')
const info = computed(() => store.value?.data)
const departments = computed(() => categories.value?.data ?? [])
const signedIn = computed(() => Boolean(session.value?.data))
const accountName = computed(() => session.value?.data?.displayName ?? '')

watch(() => route.fullPath, () => {
  menuOpen.value = false
  departmentsOpen.value = false
  search.value = typeof route.query.search === 'string' ? route.query.search : ''
  refreshSession()
})

function submitSearch() {
  const term = search.value.trim()
  navigateTo({ path: '/shop', query: term ? { search: term } : {} })
}
</script>

<template>
  <div class="min-h-svh bg-canvas text-ink">
    <div class="bg-brand-800 text-sm text-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div class="flex flex-wrap gap-x-5 gap-y-1">
          <a
            v-if="info"
            :href="`mailto:${info.email}`"
            class="inline-flex items-center gap-2"
          >
            <UIcon
              name="i-lucide-mail"
              class="size-3.5"
            />
            {{ info.email }}
          </a>
          <a
            v-if="info"
            :href="`tel:${info.phone}`"
            class="inline-flex items-center gap-2"
          >
            <UIcon
              name="i-lucide-phone"
              class="size-3.5"
            />
            {{ info.phone }}
          </a>
        </div>
        <NuxtLink
          :to="signedIn ? '/account' : '/login'"
          class="inline-flex items-center gap-2 p-1"
          :aria-label="signedIn ? accountName : 'Sign in'"
        >
          <span
            v-if="signedIn"
            class="max-w-40 truncate"
          >{{ accountName }}</span>
          <UIcon
            name="i-lucide-user"
            class="size-4"
          />
        </NuxtLink>
      </div>
    </div>
    <header class="border-b border-line bg-surface">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
        <NuxtLink
          to="/"
          class="shrink-0"
          aria-label="Ranjana Bakery & Cafe home"
        >
          <img
            src="/logo.jpg"
            alt=""
            width="72"
            height="72"
            class="size-16 rounded-md object-cover"
          >
        </NuxtLink>
        <form
          class="flex min-w-64 flex-1 overflow-hidden border border-line"
          @submit.prevent="submitSearch"
        >
          <input
            v-model="search"
            type="search"
            placeholder="What do you need?"
            aria-label="Search the menu"
            class="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none"
          >
          <button
            type="submit"
            class="bg-brand-500 px-5 text-white"
            aria-label="Search"
          >
            <UIcon
              name="i-lucide-search"
              class="size-4"
            />
          </button>
        </form>
      </div>
      <div class="border-t border-line">
        <div class="mx-auto flex max-w-6xl items-stretch px-4">
          <div
            class="relative hidden md:block"
            @mouseenter="departmentsOpen = true"
            @mouseleave="departmentsOpen = false"
          >
            <button
              type="button"
              class="inline-flex h-full items-center gap-2 bg-brand-500 px-5 text-sm font-medium text-white"
              @click="departmentsOpen = !departmentsOpen"
            >
              <UIcon
                name="i-lucide-menu"
                class="size-4"
              />
              Categories
            </button>
            <ul
              v-if="departmentsOpen"
              class="absolute top-full left-0 z-20 w-56 border border-line bg-surface py-2 shadow-card"
            >
              <li>
                <NuxtLink
                  to="/shop"
                  class="block px-4 py-2 text-sm hover:bg-brand-50"
                >
                  All
                </NuxtLink>
              </li>
              <li
                v-for="category in departments"
                :key="category.id"
              >
                <NuxtLink
                  :to="`/shop?category=${category.slug}`"
                  class="block px-4 py-2 text-sm hover:bg-brand-50"
                >
                  {{ category.name }}
                </NuxtLink>
              </li>
            </ul>
          </div>
          <nav class="hidden items-center gap-6 px-6 text-sm font-medium md:flex">
            <NuxtLink
              to="/"
              class="py-4"
              :class="route.path === '/' ? 'text-brand-600' : ''"
            >
              Home
            </NuxtLink>
            <NuxtLink
              to="/shop"
              class="py-4"
              :class="route.path.startsWith('/shop') ? 'text-brand-600' : ''"
            >
              Shop
            </NuxtLink>
          </nav>
          <button
            type="button"
            class="ml-auto inline-flex items-center gap-2 py-4 text-sm md:hidden"
            @click="menuOpen = !menuOpen"
          >
            <UIcon
              name="i-lucide-menu"
              class="size-4"
            />
            Menu
          </button>
        </div>
        <div
          v-if="menuOpen"
          class="border-t border-line px-4 py-3 md:hidden"
        >
          <NuxtLink
            to="/"
            class="block py-2 text-sm"
          >
            Home
          </NuxtLink>
          <NuxtLink
            to="/shop"
            class="block py-2 text-sm"
          >
            Shop
          </NuxtLink>
          <NuxtLink
            v-for="category in departments"
            :key="category.id"
            :to="`/shop?category=${category.slug}`"
            class="block py-2 text-sm text-ink-muted"
          >
            {{ category.name }}
          </NuxtLink>
        </div>
      </div>
    </header>
    <main>
      <slot />
    </main>
    <footer class="mt-16 bg-brand-950 text-brand-100">
      <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <img
            src="/logo.jpg"
            alt="Ranjana Bakery & Cafe"
            width="64"
            height="64"
            class="size-14 rounded-md object-cover"
          >
          <ul
            v-if="info"
            class="mt-4 space-y-2 text-sm"
          >
            <li>{{ info.address }}</li>
            <li>{{ info.phone }}</li>
            <li>{{ info.email }}</li>
          </ul>
        </div>
        <div>
          <h2 class="text-sm font-semibold tracking-widest text-white uppercase">
            Shop
          </h2>
          <ul class="mt-4 space-y-2 text-sm">
            <li>
              <NuxtLink to="/shop">
                All
              </NuxtLink>
            </li>
            <li
              v-for="category in departments"
              :key="category.id"
            >
              <NuxtLink :to="`/shop?category=${category.slug}`">
                {{ category.name }}
              </NuxtLink>
            </li>
          </ul>
        </div>
        <div>
          <h2 class="text-sm font-semibold tracking-widest text-white uppercase">
            Hours
          </h2>
          <p
            v-if="info"
            class="mt-4 text-sm"
          >
            {{ info.opens }} to {{ info.closes }}
          </p>
        </div>
      </div>
      <p class="border-t border-white/10 px-4 py-4 text-center text-xs text-brand-200">
        Ranjana Bakery & Cafe · © {{ new Date().getFullYear() }}
      </p>
    </footer>
  </div>
</template>
