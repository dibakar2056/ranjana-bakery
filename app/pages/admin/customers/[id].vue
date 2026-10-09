<script setup lang="ts">
definePageMeta({ middleware: ['staff'], layout: 'admin' })

type CustomerDetail = {
  name: string
  email: string | null
  phone: string | null
  status: string
  birthday: string | null
  preferences: string | null
  marketingConsent: boolean
  createdAt: string
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
  addresses: Array<{ id: string, line1: string, line2: string | null, city: string, isDefault: boolean }>
  recentOrders: Array<{ id: string, orderNumber: string, status: string, total: number, createdAt: string }>
}

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data, refresh, pending, error } = await useFetch<{ data: CustomerDetail }>(() => `/api/admin/customers/${id.value}`)
const note = ref('')
const customer = computed(() => data.value?.data)

function blank(value: string | null | undefined) {
  return value?.trim() ? value : 'n/a'
}

function when(value: string | null) {
  if (!value) return 'n/a'
  return new Date(value).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addressLine(item: CustomerDetail['addresses'][number]) {
  return [item.line1, item.line2, item.city].filter(part => part?.trim()).join(', ')
}

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
    <ErrorState
      v-else-if="error"
      description="We couldn't find this customer."
      @retry="refresh()"
    />
    <template v-else-if="customer">
      <PageHeader :title="customer.name">
        <UButton
          to="/admin/customers"
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
        >
          Customers
        </UButton>
      </PageHeader>
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge :status="customer.status" />
        <UBadge
          v-for="segment in customer.segments"
          :key="segment"
          color="neutral"
          variant="subtle"
        >
          {{ segment }}
        </UBadge>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <article class="h-full rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-base font-medium">
            Contact
          </h2>
          <dl class="mt-4 grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt class="text-ink-muted">
              Phone
            </dt>
            <dd class="text-right break-words">
              {{ blank(customer.phone) }}
            </dd>
            <dt class="text-ink-muted">
              Email
            </dt>
            <dd class="text-right break-words">
              {{ blank(customer.email) }}
            </dd>
            <template v-if="customer.addresses.length">
              <template
                v-for="item in customer.addresses"
                :key="item.id"
              >
                <dt class="text-ink-muted">
                  Address
                </dt>
                <dd class="text-right break-words">
                  {{ addressLine(item) }}
                </dd>
              </template>
            </template>
            <template v-else>
              <dt class="text-ink-muted">
                Address
              </dt>
              <dd class="text-right">
                n/a
              </dd>
            </template>
            <dt class="text-ink-muted">
              Birthday
            </dt>
            <dd class="text-right">
              {{ when(customer.birthday) }}
            </dd>
            <dt class="text-ink-muted">
              Preferences
            </dt>
            <dd class="text-right break-words">
              {{ blank(customer.preferences) }}
            </dd>
          </dl>
        </article>
        <article class="h-full rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-base font-medium">
            Account
          </h2>
          <dl class="mt-4 grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt class="text-ink-muted">
              Status
            </dt>
            <dd class="text-right">
              {{ customer.status === 'ACTIVE' ? 'Active' : 'Inactive' }}
            </dd>
            <dt class="text-ink-muted">
              Marketing
            </dt>
            <dd class="text-right">
              {{ customer.marketingConsent ? 'Yes' : 'No' }}
            </dd>
            <dt class="text-ink-muted">
              Customer since
            </dt>
            <dd class="text-right">
              {{ when(customer.createdAt) }}
            </dd>
            <dt class="text-ink-muted">
              Loyalty
            </dt>
            <dd class="text-right">
              {{ customer.analytics.loyaltyPoints }} points
            </dd>
            <dt class="text-ink-muted">
              Last order
            </dt>
            <dd class="text-right">
              {{ when(customer.analytics.lastOrder) }}
            </dd>
          </dl>
        </article>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Orders"
          :value="String(customer.analytics.totalOrders)"
        />
        <StatCard
          label="Spending"
          :value="customer.analytics.totalSpending.toFixed(0)"
        />
        <StatCard
          label="Average order"
          :value="customer.analytics.averageOrderValue.toFixed(0)"
        />
        <StatCard
          label="Loyalty"
          :value="String(customer.analytics.loyaltyPoints)"
          hint="points"
        />
      </div>
      <div class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">
          Favorite products
        </h2>
        <p
          v-if="!customer.analytics.favoriteProducts.length"
          class="mt-3 text-sm text-ink-muted"
        >
          No orders yet, so there is no favorite.
        </p>
        <ul
          v-else
          class="mt-3 space-y-2 text-sm"
        >
          <li
            v-for="product in customer.analytics.favoriteProducts"
            :key="product.name"
          >
            {{ product.name }} · {{ product.count }}
          </li>
        </ul>
      </div>
      <div class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">
          Recent orders
        </h2>
        <p
          v-if="!customer.recentOrders.length"
          class="mt-3 text-sm text-ink-muted"
        >
          This customer has not ordered yet.
        </p>
        <ul
          v-else
          class="mt-3 space-y-3 text-sm"
        >
          <li
            v-for="order in customer.recentOrders"
            :key="order.id"
            class="flex items-center justify-between gap-3"
          >
            <NuxtLink
              :to="`/admin/orders/${order.id}`"
              class="font-medium text-brand-700"
            >
              {{ order.orderNumber }} · {{ order.total }} · {{ when(order.createdAt) }}
            </NuxtLink>
            <StatusBadge :status="order.status" />
          </li>
        </ul>
      </div>
      <div class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">
          Notes
        </h2>
        <form
          class="mt-3 flex gap-2"
          @submit.prevent="addNote"
        >
          <UInput
            v-model="note"
            class="flex-1"
            placeholder="Add a note"
            aria-label="Customer note"
          />
          <UButton type="submit">
            Save
          </UButton>
        </form>
        <ul class="mt-4 space-y-3 text-sm">
          <li
            v-for="item in customer.notes"
            :key="item.id"
          >
            <p>{{ item.body }}</p>
            <p class="text-[13px] text-ink-muted">
              {{ item.author }} · {{ when(item.createdAt) }}
            </p>
          </li>
          <li
            v-if="!customer.notes.length"
            class="text-ink-muted"
          >
            No notes yet.
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
