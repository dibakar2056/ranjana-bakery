<script setup lang="ts">
const file = defineModel<File | null>('file', { required: true })
const current = defineModel<string | null>('current', { required: true })
const clear = defineModel<boolean>('clear', { required: true })

defineProps<{
  label: string
}>()

const replacing = ref(false)
const previewUrl = ref('')

watch(file, (next) => {
  if (previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = next ? URL.createObjectURL(next) : ''
  if (next) replacing.value = false
})

watch(current, () => {
  replacing.value = false
})

const shown = computed(() => previewUrl.value || (clear.value ? '' : current.value) || '')

onBeforeUnmount(() => {
  if (previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="relative h-44 overflow-hidden rounded-xl bg-canvas ring-1 ring-line">
    <img
      v-if="shown && !replacing"
      :src="shown"
      alt=""
      class="size-full object-cover"
    >
    <UFileUpload
      v-else
      v-model="file"
      accept="image/jpeg,image/png,image/webp"
      icon="i-lucide-image"
      :label="label"
      description="JPG, PNG, or WebP up to 2 MB"
      class="absolute inset-0"
      :ui="{ root: 'h-full', base: 'h-full rounded-none border-0 bg-transparent' }"
    />
    <div
      v-if="shown && !replacing"
      class="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-brand-950/75 to-transparent px-2 pt-8 pb-2"
    >
      <UButton
        size="xs"
        color="neutral"
        variant="solid"
        @click="replacing = true"
      >
        Change
      </UButton>
      <UButton
        v-if="current && !file"
        size="xs"
        color="neutral"
        variant="solid"
        @click="clear = !clear"
      >
        {{ clear ? 'Keep' : 'Remove' }}
      </UButton>
    </div>
  </div>
</template>
