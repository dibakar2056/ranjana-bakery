<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  noun: string
  message?: string
  loading?: boolean
}>()

const detail = computed(() => props.message ?? `This removes the ${props.noun} from the catalogue. This cannot be undone.`)

defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :close="false"
    class="sm:max-w-md"
    :ui="{
      overlay: 'bg-brand-950/45 backdrop-blur-sm',
      content: 'divide-y-0 rounded-3xl shadow-overlay',
      body: 'px-8 pt-8 pb-2',
      footer: 'grid grid-cols-2 gap-3 bg-transparent px-8 pt-2 pb-8'
    }"
  >
    <template #body>
      <div class="flex flex-col items-center text-center">
        <span class="grid size-16 place-items-center rounded-full bg-danger-50 shadow-[0_0_36px_rgb(184_74_69/0.45)]">
          <UIcon
            name="i-lucide-trash-2"
            class="size-7 text-danger-500"
          />
        </span>
        <h2 class="mt-5 text-xl font-semibold tracking-tight text-ink">
          Delete this {{ noun }}?
        </h2>
        <p class="mt-2 max-w-xs text-sm leading-6 text-ink-muted">
          {{ detail }}
        </p>
      </div>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        size="lg"
        class="w-full justify-center rounded-xl"
        @click="open = false"
      >
        Cancel
      </UButton>
      <UButton
        color="error"
        size="lg"
        class="w-full justify-center rounded-xl bg-red-500 text-white hover:bg-red-600"
        :loading="loading"
        @click="$emit('confirm')"
      >
        Delete {{ noun }}
      </UButton>
    </template>
  </UModal>
</template>
