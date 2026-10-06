<script setup lang="ts">
definePageMeta({ middleware: ['staff'], layout: 'admin' })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data, refresh, pending, error } = await useFetch<{ data: {
  name: string
  email: string | null
  phone: string | null
  status: string
  preferences: string | null
  marketingConsent: boolean
  segments: string[]
  analytics: {
    totalOrders: number
    totalSpending: number
    averageOrderValue: number
    loyaltyPoints: number
    favoriteProducts: Array<{ name: string, count: number }>
    lastOrder: string | null
  }
  notes: Array<{ id: string, body: string, author: string, createdAt: string }>
  recentOrders: Array<{ id: string, orderNumber: string, status: string, total: number, createdAt: string }>
} }>(() => `/api/admin/customers/${id.value}`)
const note = ref('')
const tab = ref<'overview' | 'orders' | 'notes'>('overview')
const customer = computed(() => data.value?.data)

async function addNote() {
  if (!note.value.trim()) return
  await $fetch(`/api/admin/customers/${id.value}`, { method: 'PATCH', body: { note: note.value } })
  note.value = ''
  await refresh()
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <LoadingSkeleton v-if="pending" />
    <ErrorState v-else-if="error" description="We couldn't find this customer." @retry="refresh()" />
    <template v-else-if="customer">
      <div class="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <div class="flex flex-wrap items-start gap-4">
          <span class="grid size-12 place-items-center rounded-full bg-brand-50 text-lg font-medium text-brand-700">
            {{ customer.name.slice(0, 1) }}
          </span>
          <div class="min-w-0 flex-1">
            <h1 class="text-[28px] leading-tight font-semibold tracking-tight">{{ customer.name }}</h1>
            <p class="mt-1 text-sm text-ink-muted">{{ customer.email || 'No email' }} · {{ customer.phone || 'No phone' }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <StatusBadge :status="customer.status" />
              <UBadge v-for="segment in customer.segments" :key="segment" color="neutral" variant="subtle">{{ segment }}</UBadge>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" :value="String(customer.analytics.totalOrders)" />
        <StatCard label="Spending" :value="customer.analytics.totalSpending.toFixed(0)" />
        <StatCard label="Average order" :value="customer.analytics.averageOrderValue.toFixed(0)" />
        <StatCard label="Loyalty" :value="String(customer.analytics.loyaltyPoints)" hint="points" />
      </div>
      <div class="mt-4 flex gap-2 border-b border-line" role="tablist">
        <button
          v-for="item in (['overview', 'orders', 'notes'] as const)"
          :key="item"
          type="button"
          role="tab"
          class="border-b-2 px-3 py-2 text-sm capitalize"
          :class="tab === item ? 'border-brand-600 font-medium text-ink' : 'border-transparent text-ink-muted'"
          :aria-selected="tab === item"
          @click="tab = item"
        >
          {{ item }}
        </button>
      </div>
      <div v-if="tab === 'overview'" class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">Favorite products</h2>
        <p v-if="!customer.analytics.favoriteProducts.length" class="mt-3 text-sm text-ink-muted">No orders yet, so there is no favorite.</p>
        <ul v-else class="mt-3 space-y-2 text-sm">
          <li v-for="product in customer.analytics.favoriteProducts" :key="product.name">{{ product.name }} · {{ product.count }}</li>
        </ul>
      </div>
      <div v-else-if="tab === 'orders'" class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">Recent orders</h2>
        <p v-if="!customer.recentOrders.length" class="mt-3 text-sm text-ink-muted">This customer has not ordered yet.</p>
        <ul v-else class="mt-3 space-y-3 text-sm">
          <li v-for="order in customer.recentOrders" :key="order.id" class="flex items-center justify-between gap-3">
            <span>{{ order.orderNumber }} · {{ order.total }}</span>
            <StatusBadge :status="order.status" />
          </li>
        </ul>
      </div>
      <div v-else class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">Notes</h2>
        <form class="mt-3 flex gap-2" @submit.prevent="addNote">
          <UInput v-model="note" class="flex-1" placeholder="Add a note" aria-label="Customer note" />
          <UButton type="submit">Save</UButton>
        </form>
        <ul class="mt-4 space-y-3 text-sm">
          <li v-for="item in customer.notes" :key="item.id">
            <p>{{ item.body }}</p>
            <p class="text-[13px] text-ink-muted">{{ item.author }}</p>
          </li>
          <li v-if="!customer.notes.length" class="text-ink-muted">No notes yet.</li>
        </ul>
      </div>
    </template>
  </section>
</template>
