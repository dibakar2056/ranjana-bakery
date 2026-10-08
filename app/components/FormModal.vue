<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  title: string
  formId: string
  saving?: boolean
  wide?: boolean
}>()

defineEmits<{ submit: [] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :class="wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'"
    :ui="{
      overlay: 'bg-brand-950/50 backdrop-blur-sm',
      content: 'overflow-hidden rounded-2xl shadow-overlay ring-1 ring-black/5 before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-1 before:bg-gradient-to-r before:from-brand-500 before:to-accent',
      header: 'border-b border-line bg-gradient-to-br from-brand-50 to-surface px-6 pt-6 pb-4 dark:from-brand-950/50 dark:to-surface',
      title: 'text-xl font-semibold tracking-tight text-ink',
      body: 'bg-surface px-6 py-5',
      footer: 'justify-end gap-2 border-t border-line bg-canvas px-6 py-4 shadow-[0_-8px_24px_rgb(20_24_28/0.04)]',
      close: 'top-5'
    }"
  >
    <template #body>
      <form
        :id="formId"
        class="grid gap-x-5 gap-y-4"
        :class="wide ? 'sm:grid-cols-2' : ''"
        @submit.prevent="$emit('submit')"
      >
        <slot />
      </form>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        @click="open = false"
      >
        Cancel
      </UButton>
      <slot name="submit">
        <UButton
          type="button"
          :loading="saving"
          @click="$emit('submit')"
        >
          Save
        </UButton>
      </slot>
    </template>
  </UModal>
</template>
