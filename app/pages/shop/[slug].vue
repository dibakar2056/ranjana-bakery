<script setup lang="ts">
definePageMeta({ layout: 'store' })

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const { data, error } = await useFetch<{ data: {
  name: string
  description: string
  price: string
  salePrice: string | null
  image: string | null
  category: string
  categorySlug: string
  ingredients: string
  allergens: string[]
} }>(() => `/api/catalog/products/${slug.value}`)
const product = computed(() => data.value?.data)
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-10">
    <p
      v-if="error || !product"
      class="text-sm text-ink-muted"
    >
      This product is not available.
    </p>
    <div
      v-else
      class="grid gap-8 md:grid-cols-2"
    >
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="aspect-square w-full object-cover"
      >
      <div
        v-else
        class="grid aspect-square place-items-center bg-brand-50 text-brand-700"
      >
        {{ product.category }}
      </div>
      <div>
        <NuxtLink
          :to="`/shop?category=${product.categorySlug}`"
          class="text-xs font-semibold tracking-widest text-brand-600 uppercase"
        >
          {{ product.category }}
        </NuxtLink>
        <h1 class="mt-2 font-display text-4xl">
          {{ product.name }}
        </h1>
        <p class="mt-4 text-lg">
          <span class="font-semibold">{{ priceLabel(product.salePrice || product.price) }}</span>
          <span
            v-if="product.salePrice"
            class="ml-2 text-ink-muted line-through"
          >
            {{ priceLabel(product.price) }}
          </span>
        </p>
        <p class="mt-4 text-sm leading-6 text-ink-muted">
          {{ product.description }}
        </p>
        <p
          v-if="product.ingredients"
          class="mt-4 text-sm"
        >
          <span class="font-medium">Ingredients. </span>{{ product.ingredients }}
        </p>
        <p
          v-if="product.allergens.length"
          class="mt-2 text-sm"
        >
          <span class="font-medium">Allergens. </span>{{ product.allergens.join(', ') }}
        </p>
        <NuxtLink
          to="/shop"
          class="mt-8 inline-block border border-brand-500 px-6 py-3 text-sm font-semibold tracking-widest text-brand-700 uppercase"
        >
          Back to shop
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
