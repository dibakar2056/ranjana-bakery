<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CalendarDate } from '@internationalized/date'

definePageMeta({ middleware: ['staff'], layout: 'admin' })

type OrderRow = {
  id: string
  orderNumber: string
  customer: string
  items: number
  total: string
  status: string
  paymentStatus: string
  fulfillment: string
  createdAt: string
}

const query = reactive({ page: 1, pageSize: 10, search: '' })
const { data: me } = await useFetch<{ data: { permissions: string[] } | null }>('/api/auth/me')
const { data, pending } = await useFetch<{ data: OrderRow[], meta: { total: number, pageSize: number } }>('/api/admin/orders', { query })
const { data: customers } = await useFetch<{ data: Array<{ id: string, name: string, status: string }> }>('/api/admin/customers', { query: { pageSize: 100 } })
const { data: products } = await useFetch<{ data: Array<{ id: string, name: string, price: string, status: string }> }>('/api/admin/products', { query: { pageSize: 100, status: 'ACTIVE' } })
watch(() => query.search, () => {
  if (query.page !== 1) query.page = 1
})

const open = ref(false)
const saving = ref(false)
const error = ref('')
const createdId = ref('')
const dateOpen = ref(false)
const calendarDate = shallowRef<CalendarDate>()
const readyTime = ref('12:00')
const image = ref<File | null>(null)
const currentImage = ref<string | null>(null)
const clearImage = ref(false)
const form = reactive({
  customerMode: 'existing' as 'existing' | 'new',
  customerId: '',
  customerName: '',
  customerPhone: '',
  customerStreet: '',
  customerCity: '',
  fulfillment: 'PICKUP',
  scheduledAt: '',
  notes: '',
  paymentStatus: 'PENDING',
  advance: '0',
  items: [{ productId: '', quantity: '1' }]
})
const toast = useToast()
const canCreate = computed(() => me.value?.data?.permissions.includes('order.create') ?? false)
const canCreateCustomer = computed(() => me.value?.data?.permissions.includes('customer.create') ?? false)
const customerOptions = computed(() => (customers.value?.data ?? []).filter(customer => customer.status === 'ACTIVE').map(customer => ({ label: customer.name, value: customer.id })))
const productOptions = computed(() => (products.value?.data ?? []).map(product => ({ label: `${product.name} · ${priceLabel(product.price)}`, value: product.id })))
const fulfillmentOptions = [
  { label: 'Pickup', value: 'PICKUP' },
  { label: 'Delivery', value: 'DELIVERY' }
]
const paymentOptions = [
  { label: 'Unpaid', value: 'PENDING' },
  { label: 'Paid', value: 'PAID' }
]
const columns: TableColumn<OrderRow>[] = [
  { id: 'sn', header: 'SN' },
  { accessorKey: 'orderNumber', header: 'Order' },
  { accessorKey: 'customer', header: 'Customer' },
  { accessorKey: 'items', header: 'Items' },
  { accessorKey: 'total', header: 'Total' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'paymentStatus', header: 'Payment' },
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

function amountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replaceAll('.', '')}`
}

function priceLabel(value: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 2 }).format(amount)
}

function serial(index: number) {
  const size = data.value?.meta.pageSize ?? query.pageSize
  return (query.page - 1) * size + index + 1
}

function openAdd() {
  error.value = ''
  createdId.value = ''
  image.value = null
  currentImage.value = null
  clearImage.value = false
  form.customerMode = 'existing'
  form.customerId = customerOptions.value[0]?.value ?? ''
  form.customerName = ''
  form.customerPhone = ''
  form.customerStreet = ''
  form.customerCity = ''
  form.fulfillment = 'PICKUP'
  form.scheduledAt = ''
  dateOpen.value = false
  calendarDate.value = undefined
  readyTime.value = '12:00'
  form.notes = ''
  form.paymentStatus = 'PENDING'
  form.advance = '0'
  form.items = [{ productId: productOptions.value[0]?.value ?? '', quantity: '1' }]
  open.value = true
}

watch([calendarDate, readyTime], syncReady)

function syncReady() {
  const day = calendarDate.value
  if (!day) {
    form.scheduledAt = ''
    return
  }
  const date = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
  form.scheduledAt = `${date}T${readyTime.value || '00:00'}`
}

function readyLabel() {
  if (!form.scheduledAt) return 'Choose a date'
  return new Date(form.scheduledAt).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

function addItem() {
  form.items.push({ productId: productOptions.value[0]?.value ?? '', quantity: '1' })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function save() {
  error.value = ''
  const fresh = form.customerMode === 'new'
  if (!fresh && !form.customerId) {
    error.value = 'Choose a customer.'
    return
  }
  if (fresh && form.customerName.trim().length < 2) {
    error.value = 'Enter the customer name.'
    return
  }
  if (fresh && (form.customerStreet.trim().length < 3 || form.customerCity.trim().length < 2)) {
    error.value = 'Enter the street and city.'
    return
  }
  const items = form.items.map(item => ({ productId: item.productId, quantity: Number(item.quantity) }))
  if (items.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1)) {
    error.value = 'Choose a product and a quantity.'
    return
  }
  const advance = form.advance === '' ? 0 : Number(form.advance)
  if (!Number.isFinite(advance) || advance < 0) {
    error.value = 'Enter an advance of zero or more.'
    return
  }
  saving.value = true
  try {
    if (!createdId.value) {
      const created = await $fetch<{ data: { id: string } }>('/api/admin/orders', {
        method: 'POST',
        body: {
          ...(fresh
            ? { customer: { name: form.customerName.trim(), phone: form.customerPhone.trim() || undefined, address: { line1: form.customerStreet.trim(), city: form.customerCity.trim() } } }
            : { customerId: form.customerId }),
          fulfillment: form.fulfillment,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
          notes: form.notes || undefined,
          paymentStatus: form.paymentStatus,
          advance,
          items
        }
      })
      createdId.value = created.data.id
    }
    if (image.value) {
      const file = new FormData()
      file.append('image', image.value)
      await $fetch(`/api/admin/orders/${createdId.value}/image`, { method: 'POST', body: file })
    }
    open.value = false
    notify('Order created.')
    await navigateTo(`/admin/orders/${createdId.value}`)
  } catch (caught) {
    error.value = message(caught, createdId.value ? 'The order was saved, but the image was not.' : 'Could not create the order.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Orders">
      <UInput
        v-model="query.search"
        icon="i-lucide-search"
        placeholder="Search orders"
        aria-label="Search orders"
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
      v-else-if="data?.data?.length"
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
        <template #orderNumber-cell="{ row }">
          <NuxtLink
            :to="`/admin/orders/${row.original.id}`"
            class="font-medium text-brand-700"
          >
            {{ row.original.orderNumber }}
          </NuxtLink>
        </template>
        <template #total-cell="{ row }">
          {{ priceLabel(row.original.total) }}
        </template>
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
        <template #paymentStatus-cell="{ row }">
          <StatusBadge :status="row.original.paymentStatus" />
        </template>
        <template #actions-cell="{ row }">
          <UTooltip text="View">
            <UButton
              :to="`/admin/orders/${row.original.id}`"
              icon="i-lucide-eye"
              color="neutral"
              variant="soft"
              size="sm"
              aria-label="View"
            />
          </UTooltip>
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
      icon="i-lucide-shopping-bag"
      title="No orders yet"
      description="Orders you add will show up here."
    />
    <FormModal
      v-model:open="open"
      title="New order"
      form-id="order-form"
      :saving="saving"
      wide
      @submit="save"
    >
      <p
        v-if="error"
        class="text-sm text-danger-600 sm:col-span-2"
      >
        {{ error }}
      </p>
      <div class="flex gap-2 sm:col-span-2">
        <UButton
          type="button"
          size="sm"
          class="rounded-lg"
          :color="form.customerMode === 'existing' ? 'primary' : 'neutral'"
          :variant="form.customerMode === 'existing' ? 'solid' : 'soft'"
          @click="form.customerMode = 'existing'"
        >
          Existing customer
        </UButton>
        <UButton
          v-if="canCreateCustomer"
          type="button"
          size="sm"
          class="rounded-lg"
          :color="form.customerMode === 'new' ? 'primary' : 'neutral'"
          :variant="form.customerMode === 'new' ? 'solid' : 'soft'"
          @click="form.customerMode = 'new'"
        >
          New customer
        </UButton>
      </div>
      <UFormField
        v-if="form.customerMode === 'existing'"
        label="Customer"
        class="sm:col-span-2"
        required
      >
        <USelect
          v-model="form.customerId"
          :items="customerOptions"
          class="w-full"
        />
      </UFormField>
      <template v-else>
        <UFormField
          label="Name"
          required
        >
          <UInput
            v-model="form.customerName"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Phone">
          <UInput
            v-model="form.customerPhone"
            type="tel"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Street"
          required
        >
          <UInput
            v-model="form.customerStreet"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="City"
          required
        >
          <UInput
            v-model="form.customerCity"
            class="w-full"
          />
        </UFormField>
      </template>
      <UFormField label="Fulfillment">
        <USelect
          v-model="form.fulfillment"
          :items="fulfillmentOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Payment">
        <USelect
          v-model="form.paymentStatus"
          :items="paymentOptions"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Advance amount">
        <UInput
          :model-value="form.advance"
          inputmode="decimal"
          class="w-full"
          @update:model-value="form.advance = amountInput(String($event ?? ''))"
          @blur="form.advance = form.advance === '' ? '0' : form.advance"
        />
      </UFormField>
      <UFormField
        label="Ready at"
        class="w-60"
      >
        <UPopover v-model:open="dateOpen">
          <UButton
            type="button"
            color="neutral"
            variant="outline"
            icon="i-lucide-calendar"
            class="w-full justify-start border border-line"
          >
            {{ readyLabel() }}
          </UButton>
          <template #content>
            <div class="rounded-xl border border-line bg-surface p-3 shadow-overlay">
              <UCalendar v-model="calendarDate" />
              <UInput
                v-model="readyTime"
                type="time"
                aria-label="Ready time"
                class="mt-3 w-full border border-line"
              />
            </div>
          </template>
        </UPopover>
      </UFormField>
      <div class="rounded-xl bg-canvas p-4 ring-1 ring-line sm:col-span-2">
        <p class="mb-3 text-sm font-medium text-ink">
          Items
        </p>
        <div class="space-y-3">
          <div
            v-for="(item, index) in form.items"
            :key="index"
            class="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_auto]"
          >
            <UFormField label="Product">
              <USelect
                v-model="item.productId"
                :items="productOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Qty">
              <UInput
                v-model="item.quantity"
                type="number"
                min="1"
                class="w-full"
              />
            </UFormField>
            <UButton
              v-if="form.items.length > 1"
              type="button"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              aria-label="Remove item"
              @click="removeItem(index)"
            />
          </div>
        </div>
        <UButton
          type="button"
          icon="i-lucide-plus"
          color="neutral"
          variant="soft"
          class="mt-3"
          @click="addItem"
        >
          Add item
        </UButton>
      </div>
      <UFormField label="Sample design">
        <ImageField
          v-model:file="image"
          v-model:current="currentImage"
          v-model:clear="clearImage"
          label="Sample design"
        />
      </UFormField>
      <UFormField label="Notes">
        <UTextarea
          v-model="form.notes"
          :rows="6"
          class="w-full"
          :ui="{ base: 'h-44' }"
        />
      </UFormField>
    </FormModal>
  </section>
</template>
