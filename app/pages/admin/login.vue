<script setup lang="ts">
definePageMeta({ layout: false })

const mode = ref<'sign-in' | 'reset' | 'code'>('sign-in')
const username = ref('')
const password = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const notice = ref('')
const pending = ref(false)

function messageFrom(caught: unknown, fallback: string) {
  if (caught && typeof caught === 'object' && 'data' in caught) {
    const data = caught.data
    if (data && typeof data === 'object' && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }
  return fallback
}

function showReset() {
  error.value = ''
  notice.value = ''
  mode.value = 'reset'
}

function showSignIn() {
  error.value = ''
  notice.value = ''
  mode.value = 'sign-in'
}

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
    error.value = messageFrom(caught, 'Sign in failed.')
  } finally {
    pending.value = false
  }
}

async function sendCode() {
  error.value = ''
  if (!username.value.trim()) {
    error.value = 'Enter your username.'
    return
  }
  pending.value = true
  try {
    await $fetch('/api/auth/password/forgot', {
      method: 'POST',
      body: { username: username.value.trim() }
    })
    mode.value = 'code'
  } catch (caught) {
    error.value = messageFrom(caught, 'The reset email could not be sent.')
  } finally {
    pending.value = false
  }
}

async function resetPassword() {
  error.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  pending.value = true
  try {
    await $fetch('/api/auth/password/reset', {
      method: 'POST',
      body: { username: username.value.trim(), otp: code.value.trim(), newPassword: newPassword.value }
    })
    password.value = ''
    code.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    mode.value = 'sign-in'
    notice.value = 'Password updated. Sign in with the new password.'
  } catch (caught) {
    error.value = messageFrom(caught, 'The password could not be reset.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="grid min-h-svh place-items-center bg-canvas px-4 py-8">
    <div class="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-line bg-surface shadow-overlay lg:grid-cols-2">
      <div class="bg-[#f3f0ea] p-4 sm:p-6">
        <div class="relative h-72 overflow-hidden rounded-2xl lg:h-full lg:min-h-[600px]">
          <img
            src="/login-bakery.jpg"
            alt=""
            class="absolute inset-0 size-full object-cover"
          >
        </div>
      </div>
      <div class="flex flex-col justify-center px-6 py-10 sm:px-12">
        <img
          src="/logo.jpg"
          alt="Ranjana Bakery & Cafe"
          width="128"
          height="128"
          class="mx-auto mb-6 size-32 rounded-2xl object-cover"
        >
        <h1 class="text-center text-4xl font-semibold tracking-tight text-ink">
          {{ mode === 'sign-in' ? 'Staff sign in' : 'Reset password' }}
        </h1>
        <p
          v-if="notice && mode === 'sign-in'"
          class="mt-4 text-sm text-brand-700"
          role="status"
        >
          {{ notice }}
        </p>
        <form
          v-if="mode === 'sign-in'"
          class="mt-8 space-y-4"
          @submit.prevent="submit"
        >
          <UFormField
            label="Username"
            required
          >
            <UInput
              v-model="username"
              icon="i-lucide-user"
              autocomplete="username"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Password"
            required
          >
            <UInput
              v-model="password"
              icon="i-lucide-lock"
              type="password"
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>
          <p
            v-if="error"
            class="text-sm text-danger-600"
            role="alert"
          >
            {{ error }}
          </p>
          <UButton
            type="submit"
            block
            size="lg"
            class="rounded-full"
            :loading="pending"
          >
            Sign in
          </UButton>
          <button
            type="button"
            class="w-full text-center text-sm text-ink-muted hover:text-ink"
            @click="showReset"
          >
            Reset password
          </button>
        </form>
        <form
          v-else-if="mode === 'reset'"
          class="mt-8 space-y-4"
          @submit.prevent="sendCode"
        >
          <UFormField
            label="Username"
            required
          >
            <UInput
              v-model="username"
              icon="i-lucide-user"
              autocomplete="username"
              class="w-full"
            />
          </UFormField>
          <p
            v-if="error"
            class="text-sm text-danger-600"
            role="alert"
          >
            {{ error }}
          </p>
          <UButton
            type="submit"
            block
            size="lg"
            class="rounded-full"
            :loading="pending"
          >
            Send code
          </UButton>
          <button
            type="button"
            class="w-full text-center text-sm text-ink-muted hover:text-ink"
            @click="showSignIn"
          >
            Back to sign in
          </button>
        </form>
        <form
          v-else
          class="mt-8 space-y-4"
          @submit.prevent="resetPassword"
        >
          <p class="text-sm text-ink-muted">
            Enter the code from the email and choose a new password.
          </p>
          <UFormField
            label="Code"
            required
          >
            <UInput
              v-model="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="New password"
            required
          >
            <UInput
              v-model="newPassword"
              icon="i-lucide-lock"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Confirm password"
            required
          >
            <UInput
              v-model="confirmPassword"
              icon="i-lucide-lock"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <p
            v-if="error"
            class="text-sm text-danger-600"
            role="alert"
          >
            {{ error }}
          </p>
          <UButton
            type="submit"
            block
            size="lg"
            class="rounded-full"
            :loading="pending"
          >
            Save password
          </UButton>
          <button
            type="button"
            class="w-full text-center text-sm text-ink-muted hover:text-ink"
            @click="showSignIn"
          >
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
