<script setup lang="ts">
definePageMeta({ layout: 'store' })

type StoreProduct = {
  name: string
  slug: string
  price: string
  salePrice: string | null
  image: string | null
  category: string
}

const route = useRoute()
const query = computed(() => ({
  search: typeof route.query.search === 'string' ? route.query.search : '',
  category: typeof route.query.category === 'string' ? route.query.category : '',
  pageSize: 24
}))
const { data, pending } = await useFetch<{ data: StoreProduct[] }>('/api/catalog/products', { query })
const products = computed(() => data.value?.data ?? [])
const heading = computed(() => query.value.search || query.value.category || 'Shop')
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-10">
    <h1 class="font-display text-4xl capitalize">
      {{ heading }}
    </h1>
    <p
      v-if="pending && !products.length"
      class="mt-6 text-sm text-ink-muted"
    >
      Loading the menu.
    </p>
    <p
      v-else-if="!products.length"
      class="mt-6 text-sm text-ink-muted"
    >
      Nothing matches that search.
    </p>
    <div
      v-else
      class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StoreProduct
        v-for="product in products"
        :key="product.slug"
        :product="product"
      />
    </div>
  </section>
</template>
