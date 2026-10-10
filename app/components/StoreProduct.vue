<script setup lang="ts">
defineProps<{
  product: {
    name: string
    slug: string
    price: string
    salePrice: string | null
    image: string | null
    category: string
  }
}>()
</script>

<template>
  <article class="group">
    <NuxtLink
      :to="`/shop/${product.slug}`"
      class="relative block overflow-hidden bg-brand-50"
    >
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
      >
      <span
        v-else
        class="grid aspect-square w-full place-items-center text-sm text-brand-700"
      >
        {{ product.category }}
      </span>
      <span
        v-if="product.salePrice"
        class="absolute top-3 left-3 bg-accent px-2 py-1 text-[11px] font-semibold tracking-wide text-white uppercase"
      >
        Sale
      </span>
    </NuxtLink>
    <div class="pt-3">
      <p class="text-[11px] font-semibold tracking-widest text-brand-600 uppercase">
        {{ product.category }}
      </p>
      <NuxtLink
        :to="`/shop/${product.slug}`"
        class="mt-1 block font-medium text-ink"
      >
        {{ product.name }}
      </NuxtLink>
      <p class="mt-1 text-sm">
        <span class="font-semibold text-ink">{{ priceLabel(product.salePrice || product.price) }}</span>
        <span
          v-if="product.salePrice"
          class="ml-2 text-ink-muted line-through"
        >
          {{ priceLabel(product.price) }}
        </span>
      </p>
    </div>
  </article>
</template>
