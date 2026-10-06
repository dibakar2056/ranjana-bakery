<script setup lang="ts">
defineProps<{
  groups: Array<{ label: string, items: Array<{ label: string, icon: string, to: string }> }>
  collapsed?: boolean
  current: (to: string) => boolean
}>()

const emit = defineEmits<{ navigate: [] }>()
</script>

<template>
  <div class="flex h-full flex-col bg-[#0f1c1c] text-white">
    <NuxtLink to="/admin" class="flex items-center gap-3 border-b border-white/10 px-4 py-5" :class="collapsed ? 'justify-center px-2' : ''" aria-label="Ranjana Bakery & Cafe" @click="emit('navigate')">
      <img src="/logo.jpg" alt="" width="36" height="36" class="h-9 w-9 shrink-0 rounded-lg object-cover">
      <span v-if="!collapsed" class="min-w-0">
        <span class="block truncate text-sm font-semibold text-white">Ranjana Bakery</span>
        <span class="block text-xs text-brand-200">& Cafe</span>
      </span>
    </NuxtLink>
    <nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin">
      <div v-for="group in groups" :key="group.label">
        <p v-if="!collapsed" class="px-3 pb-1 text-[11px] font-medium tracking-wide text-brand-300 uppercase">
          {{ group.label }}
        </p>
        <div class="space-y-0.5">
          <UTooltip v-for="item in group.items" :key="item.to" :text="item.label" :disabled="!collapsed">
            <NuxtLink
              :to="item.to"
              class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-brand-100 transition-colors duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
              :class="[
                current(item.to) ? 'bg-white/10 text-white shadow-[inset_3px_0_0_var(--color-brand-300)]' : '',
                collapsed ? 'justify-center px-2' : ''
              ]"
              @click="emit('navigate')"
            >
              <UIcon :name="item.icon" class="size-4 shrink-0" :class="current(item.to) ? 'text-brand-200' : ''" />
              <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </UTooltip>
        </div>
      </div>
    </nav>
  </div>
</template>
