<script setup lang="ts">
const props = defineProps<{ status: string }>()

const color = computed(() => {
  const value = props.status.toUpperCase()
  if (['ACTIVE', 'PAID', 'COMPLETED', 'DELIVERED', 'READY'].includes(value)) return 'success' as const
  if (['PENDING', 'CONFIRMED', 'QUOTED', 'SCHEDULED'].includes(value)) return 'warning' as const
  if (['PREPARING', 'REVIEWING', 'REQUESTED'].includes(value)) return 'info' as const
  if (['CANCELLED', 'FAILED', 'DISABLED', 'REFUNDED'].includes(value)) return 'error' as const
  return 'neutral' as const
})
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
    class="rounded-md"
  >
    {{ status }}
  </UBadge>
</template>
