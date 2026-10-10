<script setup lang="ts">
definePageMeta({ middleware: ['account'], layout: 'store' })

type Account = {
  name: string
  username: string
  email: string
  phone: string | null
  birthday: string | null
  preferences: string | null
  address: string | null
  since: string | null
  loyalty: number
  orders: Array<{ orderNumber: string, status: string, total: string, createdAt: string }>
}

const { data, error, refresh, pending } = await useFetch<{ data: Account }>('/api/account')
const account = computed(() => data.value?.data)
const signingOut = ref(false)

function blank(value: string | null | undefined) {
  return value?.trim() ? value : 'n/a'
}

function when(value: string | null) {
  if (!value) return 'n/a'
  return new Date(value).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function signOut() {
  signingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await navigateTo('/')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl px-4 py-10">
    <p
      v-if="pending"
      class="text-sm text-ink-muted"
    >
      Loading your account.
    </p>
    <p
      v-else-if="error || !account"
      class="text-sm text-ink-muted"
    >
      Your account could not be loaded.
      <button
        type="button"
        class="ml-2 underline"
        @click="refresh()"
      >
        Try again
      </button>
    </p>
    <template v-else>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="font-display text-4xl">
          {{ account.name }}
        </h1>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold tracking-widest text-white uppercase shadow-sm disabled:opacity-60"
          :disabled="signingOut"
          @click="signOut"
        >
          <UIcon
            name="i-lucide-log-out"
            class="size-4"
          />
          {{ signingOut ? 'Signing out' : 'Sign out' }}
        </button>
      </div>
      <dl class="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Username
          </dt>
          <dd class="mt-1">
            {{ account.username }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Email
          </dt>
          <dd class="mt-1">
            {{ blank(account.email) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Phone
          </dt>
          <dd class="mt-1">
            {{ blank(account.phone) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Address
          </dt>
          <dd class="mt-1">
            {{ blank(account.address) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Birthday
          </dt>
          <dd class="mt-1">
            {{ when(account.birthday) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Customer since
          </dt>
          <dd class="mt-1">
            {{ when(account.since) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Preferences
          </dt>
          <dd class="mt-1">
            {{ blank(account.preferences) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Loyalty
          </dt>
          <dd class="mt-1">
            {{ account.loyalty }}
          </dd>
        </div>
      </dl>
      <h2 class="mt-10 font-display text-2xl">
        Orders
      </h2>
      <p
        v-if="!account.orders.length"
        class="mt-3 text-sm text-ink-muted"
      >
        No orders yet.
      </p>
      <ul
        v-else
        class="mt-4 divide-y divide-line border-y border-line"
      >
        <li
          v-for="order in account.orders"
          :key="order.orderNumber"
          class="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
        >
          <span>{{ order.orderNumber }}</span>
          <span>{{ order.status }}</span>
          <span>{{ when(order.createdAt) }}</span>
          <span>{{ priceLabel(order.total) }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>
