<script setup lang="ts">
definePageMeta({ middleware: ['staff'], layout: 'admin' })

type OrderDetail = {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  fulfillment: string
  scheduledAt: string | null
  notes: string | null
  image: string | null
  total: string
  advance: string
  createdAt: string
  customer: { id: string, name: string, phone: string | null, email: string | null, address: string | null }
  items: Array<{ id: string, name: string, sku: string, quantity: number, unitPrice: string, lineTotal: string }>
  history: Array<{ id: string, fromStatus: string | null, toStatus: string, createdAt: string }>
  payments: Array<{ id: string, method: string, status: string, amount: string }>
}

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: me } = await useFetch<{ data: { permissions: string[] } | null }>('/api/auth/me')
const { data, refresh, pending, error } = await useFetch<{ data: OrderDetail }>(() => `/api/admin/orders/${id.value}`)
const order = computed(() => data.value?.data)
const status = ref('')
const paymentStatus = ref('')
const advance = ref('0')
const saving = ref(false)
const toast = useToast()
const canUpdate = computed(() => me.value?.data?.permissions.includes('order.update') ?? false)
const canCancel = computed(() => me.value?.data?.permissions.includes('order.cancel') ?? false)
const due = computed(() => {
  if (!order.value) return '0'
  return String(Math.max(0, Number(order.value.total) - Number(order.value.advance)))
})

const statusOptions = computed(() => {
  const values = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED']
  return values
    .filter(value => value !== 'CANCELLED' || canCancel.value || order.value?.status === 'CANCELLED')
    .map(value => ({ label: pretty(value), value }))
})
const paymentOptions = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map(value => ({ label: pretty(value), value }))

watch(order, (value) => {
  if (!value) return
  status.value = value.status
  paymentStatus.value = value.paymentStatus
  advance.value = value.advance || '0'
}, { immediate: true })

function amountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replaceAll('.', '')}`
}

function pretty(value: string) {
  const text = value.toLowerCase().replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function priceLabel(value: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 2 }).format(amount)
}

function when(value: string) {
  return new Date(value).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

function message(caught: unknown, fallback: string) {
  if (caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data) {
    return String(caught.data.statusMessage)
  }
  return fallback
}

async function save() {
  if (!order.value) return
  saving.value = true
  try {
    await $fetch(`/api/admin/orders/${order.value.id}`, {
      method: 'PATCH',
      body: { status: status.value, paymentStatus: paymentStatus.value, advance: Number(advance.value || 0) }
    })
    toast.add({ title: 'Order updated.', color: 'success' })
    await refresh()
  } catch (caught) {
    toast.add({ title: message(caught, 'Could not update the order.'), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <LoadingSkeleton v-if="pending && !order" />
    <ErrorState
      v-else-if="error || !order"
      description="We couldn't load this order."
      @retry="refresh()"
    />
    <template v-else>
      <PageHeader :title="order.orderNumber">
        <UButton
          to="/admin/orders"
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
        >
          Orders
        </UButton>
      </PageHeader>
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge :status="order.status" />
        <StatusBadge :status="order.paymentStatus" />
      </div>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article class="h-full rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-base font-medium">
            Customer
          </h2>
          <dl class="mt-4 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt class="text-ink-muted">
              Name
            </dt>
            <dd class="text-right">
              <NuxtLink
                :to="`/admin/customers/${order.customer.id}`"
                class="font-medium text-brand-700"
              >
                {{ order.customer.name }}
              </NuxtLink>
            </dd>
            <dt class="text-ink-muted">
              Phone
            </dt>
            <dd class="text-right">
              {{ order.customer.phone || 'n/a' }}
            </dd>
            <dt class="text-ink-muted">
              Email
            </dt>
            <dd class="truncate text-right">
              {{ order.customer.email || 'n/a' }}
            </dd>
            <dt class="text-ink-muted">
              Address
            </dt>
            <dd class="text-right break-words">
              {{ order.customer.address || 'n/a' }}
            </dd>
          </dl>
        </article>
        <article class="h-full rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-base font-medium">
            Order
          </h2>
          <dl class="mt-4 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt class="text-ink-muted">
              Placed
            </dt>
            <dd class="text-right">
              {{ when(order.createdAt) }}
            </dd>
            <dt class="text-ink-muted">
              {{ order.fulfillment === 'DELIVERY' ? 'Delivery' : 'Pickup' }}
            </dt>
            <dd class="text-right">
              {{ order.scheduledAt ? when(order.scheduledAt) : 'n/a' }}
            </dd>
            <dt class="text-ink-muted">
              Notes
            </dt>
            <dd class="text-right break-words">
              {{ order.notes || 'n/a' }}
            </dd>
          </dl>
        </article>
        <article class="h-full rounded-2xl border border-line bg-surface p-5 shadow-card md:col-span-2 xl:col-span-1">
          <h2 class="text-base font-medium">
            Payment
          </h2>
          <dl class="mt-4 grid grid-cols-[8.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
            <dt class="text-ink-muted">
              Total
            </dt>
            <dd class="text-right font-medium">
              {{ priceLabel(order.total) }}
            </dd>
            <dt class="text-ink-muted">
              Advance amount
            </dt>
            <dd class="text-right">
              {{ priceLabel(order.advance) }}
            </dd>
            <dt class="text-ink-muted">
              Due
            </dt>
            <dd class="text-right">
              {{ priceLabel(due) }}
            </dd>
          </dl>
          <form
            v-if="canUpdate"
            class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1"
            @submit.prevent="save"
          >
            <UFormField label="Status">
              <USelect
                v-model="status"
                :items="statusOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Payment">
              <USelect
                v-model="paymentStatus"
                :items="paymentOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Advance amount"
              class="sm:col-span-2 xl:col-span-1"
            >
              <UInput
                :model-value="advance"
                inputmode="decimal"
                class="w-full"
                @update:model-value="advance = amountInput(String($event ?? ''))"
                @blur="advance = advance === '' ? '0' : advance"
              />
            </UFormField>
            <UButton
              type="submit"
              :loading="saving"
              class="sm:col-span-2 xl:col-span-1 w-fit"
            >
              Save
            </UButton>
          </form>
        </article>
      </div>
      <article class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">
          Items
        </h2>
        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-ink-muted">
              <tr class="border-b border-line">
                <th class="py-2 pr-3 font-medium">
                  Product
                </th>
                <th class="py-2 pr-3 font-medium">
                  Qty
                </th>
                <th class="py-2 pr-3 font-medium">
                  Price
                </th>
                <th class="py-2 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in order.items"
                :key="item.id"
                class="border-b border-line"
              >
                <td class="py-3 pr-3">
                  <span class="font-medium">{{ item.name }}</span>
                  <span class="mt-0.5 block text-xs text-ink-muted">{{ item.sku }}</span>
                </td>
                <td class="py-3 pr-3">
                  {{ item.quantity }}
                </td>
                <td class="py-3 pr-3">
                  {{ priceLabel(item.unitPrice) }}
                </td>
                <td class="py-3 text-right font-medium">
                  {{ priceLabel(item.lineTotal) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-4 text-right text-base font-medium">
          {{ priceLabel(order.total) }}
        </p>
      </article>
      <article class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-base font-medium">
          History
        </h2>
        <ul class="mt-4 space-y-3 text-sm">
          <li
            v-for="entry in order.history"
            :key="entry.id"
            class="flex items-center justify-between gap-3"
          >
            <span>{{ entry.fromStatus ? pretty(entry.fromStatus) + ' → ' + pretty(entry.toStatus) : pretty(entry.toStatus) }}</span>
            <span class="text-ink-muted">{{ when(entry.createdAt) }}</span>
          </li>
        </ul>
      </article>
      <article
        v-if="order.image"
        class="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card"
      >
        <h2 class="text-base font-medium">
          Sample design
        </h2>
        <a
          :href="order.image"
          target="_blank"
          class="mt-4 block overflow-hidden rounded-xl bg-canvas"
        >
          <img
            :src="order.image"
            alt="Sample design"
            class="mx-auto max-h-64 max-w-sm object-contain"
          >
        </a>
      </article>
    </template>
  </section>
</template>
