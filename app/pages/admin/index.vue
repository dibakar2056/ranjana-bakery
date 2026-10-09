<script setup lang="ts">
definePageMeta({ middleware: ['staff'], layout: 'admin' })

type Summary = {
  currency: string
  revenue: { today: number, week: number, month: number }
  orders: { pending: number, completed: number, month: number }
  customers: { total: number, newer: number, returning: number }
  averageOrderValue: number
  lowStock: Array<{ id: string, name: string, onHand: number }>
  pendingReviews: number
  customCakeRequests: number
  upcoming: Array<{ id: string, orderNumber: string, scheduledAt: string | null, customer: string, status: string }>
  revenueSeries: Array<{ date: string, total: number }>
}

const { data: me } = await useFetch<{ data: { displayName: string } | null }>('/api/auth/me')
const { data, pending, error, refresh } = await useFetch<{ data: Summary }>('/api/admin/dashboard')
const summary = computed(() => data.value?.data)
const weekBars = computed(() => (summary.value?.revenueSeries ?? []).slice(-7).map(point => ({
  ...point,
  label: new Date(`${point.date}T12:00:00`).toLocaleDateString('en', { weekday: 'short' })
})))
const maxRevenue = computed(() => Math.max(1, ...weekBars.value.map(point => point.total)))
const greeting = computed(() => {
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return `${hello}, ${me.value?.data?.displayName ?? 'there'}`
})

function money(amount: number) {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: summary.value?.currency || 'NPR',
    maximumFractionDigits: 0
  }).format(amount)
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader :title="greeting" />
    <LoadingSkeleton
      v-if="pending"
      :lines="2"
    />
    <ErrorState
      v-else-if="error"
      description="We couldn't load the bakery summary. Please try again."
      @retry="refresh()"
    />
    <template v-else-if="summary">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          tone="solid"
          label="Revenue today"
          :value="money(summary.revenue.today)"
          :hint="`This week ${money(summary.revenue.week)}`"
          icon="i-lucide-banknote"
        />
        <StatCard
          label="Orders this month"
          :value="String(summary.orders.month)"
          :hint="`${summary.orders.pending} still open`"
          icon="i-lucide-shopping-bag"
        />
        <StatCard
          label="Customers"
          :value="String(summary.customers.total)"
          :hint="`${summary.customers.newer} new · ${summary.customers.returning} returning`"
          icon="i-lucide-users"
        />
        <StatCard
          label="Average order"
          :value="money(summary.averageOrderValue)"
          :hint="`Last 30 days ${money(summary.revenue.month)}`"
          icon="i-lucide-receipt"
        />
      </div>
      <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <article class="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="text-base font-medium text-ink">
              Revenue
            </h2>
            <p class="text-[13px] text-ink-muted">
              Last 7 days
            </p>
          </div>
          <div
            class="mt-6 flex h-40 items-end gap-3"
            role="img"
            aria-label="Revenue for the last 7 days"
          >
            <div
              v-for="point in weekBars"
              :key="point.date"
              class="flex flex-1 flex-col items-center gap-2"
            >
              <div class="flex h-32 w-full items-end">
                <div
                  class="w-full rounded-md"
                  :class="point.total ? 'bg-accent' : 'bg-accent/20'"
                  :style="{ height: point.total ? `${Math.max(12, (point.total / maxRevenue) * 100)}%` : '8px' }"
                  :title="`${point.date}: ${money(point.total)}`"
                />
              </div>
              <span class="text-[12px] text-ink-muted">{{ point.label }}</span>
            </div>
          </div>
        </article>
        <article class="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-base font-medium text-ink">
            Needs attention
          </h2>
          <ul class="mt-4 divide-y divide-line text-sm">
            <li class="flex items-center justify-between py-3">
              <span class="text-ink-muted">Open orders</span>
              <span class="font-medium">{{ summary.orders.pending }}</span>
            </li>
            <li class="flex items-center justify-between py-3">
              <span class="text-ink-muted">Completed</span>
              <span class="font-medium">{{ summary.orders.completed }}</span>
            </li>
            <li class="flex items-center justify-between py-3">
              <span class="text-ink-muted">Custom cakes</span>
              <span class="font-medium">{{ summary.customCakeRequests }}</span>
            </li>
            <li class="flex items-center justify-between py-3">
              <span class="text-ink-muted">Reviews waiting</span>
              <span class="font-medium">{{ summary.pendingReviews }}</span>
            </li>
          </ul>
        </article>
      </div>
      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <article class="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-base font-medium text-ink">
            Upcoming orders
          </h2>
          <p
            v-if="!summary.upcoming.length"
            class="mt-4 text-sm text-ink-muted"
          >
            No orders are scheduled.
          </p>
          <ul
            v-else
            class="mt-4 space-y-3 text-sm"
          >
            <li
              v-for="order in summary.upcoming"
              :key="order.id"
              class="flex items-center justify-between gap-3"
            >
              <NuxtLink
                :to="`/admin/orders/${order.id}`"
                class="font-medium text-brand-700"
              >
                {{ order.orderNumber }} · {{ order.customer }}
              </NuxtLink>
              <StatusBadge :status="order.status" />
            </li>
          </ul>
        </article>
        <article class="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-base font-medium text-ink">
            Low stock
          </h2>
          <p
            v-if="!summary.lowStock.length"
            class="mt-4 text-sm text-ink-muted"
          >
            Ingredient stock is above reorder points.
          </p>
          <ul
            v-else
            class="mt-4 space-y-3 text-sm"
          >
            <li
              v-for="item in summary.lowStock"
              :key="item.id"
              class="flex items-center justify-between"
            >
              <span>{{ item.name }}</span>
              <span class="text-ink-muted">{{ item.onHand }} on hand</span>
            </li>
          </ul>
        </article>
      </div>
    </template>
  </section>
</template>
