<script setup lang="ts">
const username = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

async function submit() {
  error.value = ''
  pending.value = true
  try {
    const result = await $fetch<{ data: { activationRequired: boolean } }>('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value }
    })
    await navigateTo(result.data.activationRequired ? '/activate' : '/admin')
  } catch (caught) {
    error.value = messageFrom(caught)
  } finally {
    pending.value = false
  }
}

function messageFrom(caught: unknown) {
  if (caught && typeof caught === 'object' && 'data' in caught) {
    const data = caught.data
    if (data && typeof data === 'object' && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }
  return 'Sign in failed.'
}
</script>

<template>
  <section class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
    <img
      src="/logo.jpg"
      alt="Ranjana Bakery & Cafe"
      width="96"
      height="96"
      class="mx-auto h-24 w-24 rounded-2xl object-cover"
    >
    <h1 class="mt-6 text-center font-display text-4xl text-ink">
      Staff sign in
    </h1>
    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <UFormField label="Username" required>
        <UInput v-model="username" autocomplete="username" class="w-full" />
      </UFormField>
      <UFormField label="Password" required>
        <UInput v-model="password" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>
      <p v-if="error" class="text-sm text-red-700" role="alert">
        {{ error }}
      </p>
      <UButton type="submit" block :loading="pending">
        Sign in
      </UButton>
    </form>
  </section>
</template>
