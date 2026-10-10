<script setup lang="ts">
definePageMeta({ layout: 'store' })

type StoreCategory = { id: string, name: string, slug: string, image: string | null, products: number }
type StoreProduct = {
  name: string
  slug: string
  price: string
  salePrice: string | null
  image: string | null
  category: string
}

const { data: categories } = await useFetch<{ data: StoreCategory[] }>('/api/catalog/categories')
const { data: products } = await useFetch<{ data: StoreProduct[] }>('/api/catalog/products', { query: { pageSize: 8 } })
const banners = computed(() => (categories.value?.data ?? []).slice(0, 3))
const menu = computed(() => products.value?.data ?? [])
</script>

<template>
  <div>
    <section class="relative min-h-[420px] bg-brand-900 text-white">
      <img
        src="/login-bakery.jpg"
        alt=""
        class="absolute inset-0 size-full object-cover opacity-50"
      >
      <div class="relative mx-auto flex min-h-[420px] max-w-6xl items-center px-4 py-16">
        <div class="max-w-lg">
          <p class="text-sm font-semibold tracking-widest text-brand-100 uppercase">
            Baked today
          </p>
          <h1 class="mt-3 font-display text-5xl leading-tight">
            Cakes, bread, and cafe favorites
          </h1>
          <p class="mt-4 text-brand-50">
            Order from the counter menu. Fresh bakes from Ranjana Bakery & Cafe.
          </p>
          <NuxtLink
            to="/shop"
            class="mt-6 inline-block bg-accent px-8 py-3 text-sm font-semibold tracking-widest text-white uppercase"
          >
            Shop now
          </NuxtLink>
        </div>
      </div>
    </section>
    <section
      v-if="banners.length"
      class="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3"
    >
      <NuxtLink
        v-for="category in banners"
        :key="category.id"
        :to="`/shop?category=${category.slug}`"
        class="relative block h-52 overflow-hidden bg-brand-100"
      >
        <img
          v-if="category.image"
          :src="category.image"
          :alt="category.name"
          class="size-full object-cover"
        >
        <span class="absolute inset-x-0 bottom-0 bg-brand-950/55 px-4 py-3 text-lg font-medium text-white">
          {{ category.name }}
        </span>
      </NuxtLink>
    </section>
    <section class="mx-auto max-w-6xl px-4 pb-4">
      <div class="mb-6 flex items-end justify-between gap-4">
        <h2 class="font-display text-3xl">
          From the kitchen
        </h2>
        <NuxtLink
          to="/shop"
          class="text-sm font-semibold tracking-widest text-brand-600 uppercase"
        >
          View all
        </NuxtLink>
      </div>
      <p
        v-if="!menu.length"
        class="text-sm text-ink-muted"
      >
        The menu is being prepared.
      </p>
      <div
        v-else
        class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StoreProduct
          v-for="product in menu"
          :key="product.slug"
          :product="product"
        />
      </div>
    </section>
  </div>
</template>
