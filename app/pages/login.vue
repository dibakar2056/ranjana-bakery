<script setup lang="ts">
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const toast = useToast()
const mode = ref<'sign-in' | 'sign-up' | 'forgot' | 'code'>('sign-in')
const name = ref('')
const email = ref('')
const username = ref('')
const password = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const notice = ref('')
const pending = ref(false)

type TokenClient = {
  requestAccessToken: () => void
}

function messageFrom(caught: unknown, fallback: string) {
  if (caught && typeof caught === 'object' && 'data' in caught) {
    const data = caught.data
    if (data && typeof data === 'object' && 'statusMessage' in data && typeof data.statusMessage === 'string') {
      return data.statusMessage
    }
  }
  if (caught instanceof Error && caught.message) return caught.message
  return fallback
}

function notify(title: string) {
  toast.add({ title, color: 'error' })
}

function show(next: 'sign-in' | 'sign-up' | 'forgot' | 'code') {
  notice.value = ''
  mode.value = next
}

const title = computed(() => {
  if (mode.value === 'sign-up') return 'SIGN UP'
  if (mode.value === 'sign-in') return 'LOGIN'
  return 'RESET PASSWORD'
})

function loadGoogle() {
  const google = (window as Window & { google?: { accounts: { oauth2: { initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: { access_token?: string, error?: string }) => void
    error_callback?: () => void
  }) => TokenClient } } } }).google
  if (google) return Promise.resolve(google)
  return new Promise<NonNullable<typeof google>>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      const ready = (window as Window & { google?: NonNullable<typeof google> }).google
      if (ready) resolve(ready)
      else reject(new Error('Google sign-in failed.'))
    }
    script.onerror = () => reject(new Error('Google sign-in failed.'))
    document.head.appendChild(script)
  })
}

async function submit() {
  pending.value = true
  try {
    if (mode.value === 'sign-up') {
      await $fetch('/api/auth/customer/register', {
        method: 'POST',
        body: {
          name: name.value,
          email: email.value,
          username: username.value,
          password: password.value
        }
      })
    } else {
      await $fetch('/api/auth/customer/login', {
        method: 'POST',
        body: { username: username.value, password: password.value }
      })
    }
    await navigateTo('/')
  } catch (caught) {
    notify(messageFrom(caught, mode.value === 'sign-up' ? 'Sign up failed.' : 'Sign in failed.'))
  } finally {
    pending.value = false
  }
}

async function sendCode() {
  if (!username.value.trim()) {
    notify('Enter your username or email.')
    return
  }
  pending.value = true
  try {
    await $fetch('/api/auth/customer/forgot', {
      method: 'POST',
      body: { username: username.value.trim() }
    })
    mode.value = 'code'
  } catch (caught) {
    notify(messageFrom(caught, 'The reset email could not be sent.'))
  } finally {
    pending.value = false
  }
}

async function resetPassword() {
  if (newPassword.value !== confirmPassword.value) {
    notify('Passwords do not match.')
    return
  }
  pending.value = true
  try {
    await $fetch('/api/auth/customer/reset', {
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
    notify(messageFrom(caught, 'The password could not be reset.'))
  } finally {
    pending.value = false
  }
}

async function continueWithGoogle() {
  const clientId = config.public.googleClientId
  if (!clientId) {
    notify('Google sign-in is not configured.')
    return
  }
  pending.value = true
  try {
    const google = await loadGoogle()
    const accessToken = await new Promise<string>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: (response) => {
          if (response.access_token) resolve(response.access_token)
          else reject(new Error('Google sign-in was cancelled.'))
        },
        error_callback: () => reject(new Error('Google sign-in was cancelled.'))
      })
      client.requestAccessToken()
    })
    await $fetch('/api/auth/customer/google', {
      method: 'POST',
      body: { accessToken }
    })
    await navigateTo('/')
  } catch (caught) {
    notify(messageFrom(caught, 'Google sign-in failed.'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-brand-100 px-4 py-8">
    <section class="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:min-h-[640px] md:grid-cols-2">
      <div class="relative px-8 py-8">
        <NuxtLink
          to="/"
          class="inline-flex"
          aria-label="Ranjana Bakery & Cafe home"
        >
          <img
            src="/logo.jpg"
            alt=""
            width="72"
            height="72"
            class="size-16 rounded-2xl object-cover"
          >
        </NuxtLink>
        <div class="relative mx-auto mt-6 aspect-square max-w-sm">
          <span class="absolute top-6 left-4 size-16 rounded-full bg-brand-100" />
          <span class="absolute right-2 bottom-10 size-20 rounded-full bg-brand-100" />
          <span class="absolute inset-8 rounded-[46%_54%_48%_52%] bg-brand-200" />
          <span class="absolute inset-2 rounded-[42%_58%_50%_50%] bg-brand-300/70" />
          <img
            src="/login-bakery.jpg"
            alt="Cakes and pastries from the bakery"
            class="absolute inset-10 size-[calc(100%-5rem)] rounded-[44%] object-cover"
          >
        </div>
      </div>
      <div class="relative flex items-center bg-brand-800 px-8 py-12 text-white md:px-16">
        <span class="absolute inset-y-0 -left-20 hidden w-36 rounded-full bg-white md:block" />
        <div class="relative w-full md:pl-8">
          <h1 class="text-center text-3xl font-semibold tracking-[0.2em]">
            {{ title }}
          </h1>
          <p
            v-if="notice && mode === 'sign-in'"
            class="mt-4 text-center text-sm"
            role="status"
          >
            {{ notice }}
          </p>
          <form
            class="auth-fields mt-8 space-y-4"
            @submit.prevent="mode === 'forgot' ? sendCode() : mode === 'code' ? resetPassword() : submit()"
          >
            <label
              v-if="mode === 'sign-up'"
              class="block text-sm"
            >
              Name
              <span class="mt-1 flex items-center gap-2 rounded-full bg-white/15 px-4">
                <UIcon
                  name="i-lucide-user"
                  class="size-4 shrink-0 text-white/80"
                />
                <input
                  v-model="name"
                  type="text"
                  required
                  autocomplete="name"
                  placeholder="Your name"
                  class="w-full bg-transparent py-2.5 outline-none placeholder:text-white/50"
                >
              </span>
            </label>
            <label
              v-if="mode === 'sign-up'"
              class="block text-sm"
            >
              Email
              <span class="mt-1 flex items-center gap-2 rounded-full bg-white/15 px-4">
                <UIcon
                  name="i-lucide-mail"
                  class="size-4 shrink-0 text-white/80"
                />
                <input
                  v-model="email"
                  type="email"
                  required
                  autocomplete="email"
                  placeholder="Email address"
                  class="w-full bg-transparent py-2.5 outline-none placeholder:text-white/50"
                >
              </span>
            </label>
            <label
              v-if="mode !== 'code'"
              class="block text-sm"
            >
              {{ mode === 'sign-up' ? 'Username' : 'Username or email' }}
              <span class="mt-1 flex items-center gap-2 rounded-full bg-white/15 px-4">
                <UIcon
                  name="i-lucide-user"
                  class="size-4 shrink-0 text-white/80"
                />
                <input
                  v-model="username"
                  type="text"
                  required
                  autocomplete="username"
                  :placeholder="mode === 'sign-up' ? 'Username' : 'Username or email'"
                  class="w-full bg-transparent py-2.5 outline-none placeholder:text-white/50"
                >
              </span>
            </label>
            <label
              v-if="mode === 'sign-in' || mode === 'sign-up'"
              class="block text-sm"
            >
              Password
              <span class="mt-1 flex items-center gap-2 rounded-full bg-white/15 px-4">
                <UIcon
                  name="i-lucide-lock"
                  class="size-4 shrink-0 text-white/80"
                />
                <input
                  v-model="password"
                  type="password"
                  required
                  :autocomplete="mode === 'sign-up' ? 'new-password' : 'current-password'"
                  placeholder="Password"
                  class="w-full bg-transparent py-2.5 outline-none placeholder:text-white/50"
                >
              </span>
            </label>
            <p
              v-if="mode === 'sign-in'"
              class="text-right text-sm"
            >
              <button
                type="button"
                class="text-white/90 underline-offset-4 hover:underline"
                @click="show('forgot')"
              >
                Forgot password
              </button>
            </p>
            <label
              v-if="mode === 'code'"
              class="block text-sm"
            >
              Code
              <span class="mt-1 flex items-center gap-2 rounded-full bg-white/15 px-4">
                <UIcon
                  name="i-lucide-key-round"
                  class="size-4 shrink-0 text-white/80"
                />
                <input
                  v-model="code"
                  type="text"
                  required
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  placeholder="6-digit code"
                  class="w-full bg-transparent py-2.5 outline-none placeholder:text-white/50"
                >
              </span>
            </label>
            <label
              v-if="mode === 'code'"
              class="block text-sm"
            >
              New password
              <span class="mt-1 flex items-center gap-2 rounded-full bg-white/15 px-4">
                <UIcon
                  name="i-lucide-lock"
                  class="size-4 shrink-0 text-white/80"
                />
                <input
                  v-model="newPassword"
                  type="password"
                  required
                  autocomplete="new-password"
                  placeholder="New password"
                  class="w-full bg-transparent py-2.5 outline-none placeholder:text-white/50"
                >
              </span>
            </label>
            <label
              v-if="mode === 'code'"
              class="block text-sm"
            >
              Confirm password
              <span class="mt-1 flex items-center gap-2 rounded-full bg-white/15 px-4">
                <UIcon
                  name="i-lucide-lock"
                  class="size-4 shrink-0 text-white/80"
                />
                <input
                  v-model="confirmPassword"
                  type="password"
                  required
                  autocomplete="new-password"
                  placeholder="Confirm password"
                  class="w-full bg-transparent py-2.5 outline-none placeholder:text-white/50"
                >
              </span>
            </label>
            <button
              type="submit"
              class="mx-auto block rounded-full bg-accent px-10 py-2.5 text-sm font-semibold tracking-[0.2em] text-white uppercase disabled:opacity-60"
              :disabled="pending"
            >
              {{ mode === 'sign-up' ? 'Sign up' : mode === 'forgot' ? 'Send code' : mode === 'code' ? 'Save password' : 'Login' }}
            </button>
          </form>
          <div
            v-if="mode === 'sign-in' || mode === 'sign-up'"
            class="mt-6 flex items-center gap-3 text-xs tracking-wide text-white/70"
          >
            <span class="h-px flex-1 bg-white/30" />
            or
            <span class="h-px flex-1 bg-white/30" />
          </div>
          <button
            v-if="mode === 'sign-in' || mode === 'sign-up'"
            type="button"
            class="mx-auto mt-4 flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
            :disabled="pending"
            @click="continueWithGoogle"
          >
            <svg
              viewBox="0 0 24 24"
              class="size-4"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 5.9-1 7.9-2.8l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.2-6.9-5.1H1.3v3c2 4 6.1 6.6 10.7 6.6z"
              />
              <path
                fill="#FBBC05"
                d="M5.1 14.4A7.2 7.2 0 0 1 4.7 12c0-.8.1-1.6.4-2.4V6.6H1.3A12 12 0 0 0 0 12c0 1.9.5 3.8 1.3 5.4l3.8-3z"
              />
              <path
                fill="#EA4335"
                d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.3 2.6 1.3 6.6l3.8 3C6.1 7 8.8 4.8 12 4.8z"
              />
            </svg>
            Continue with Google
          </button>
          <p class="mt-6 text-center text-sm">
            <button
              v-if="mode === 'sign-in'"
              type="button"
              class="text-white/90 underline-offset-4 hover:underline"
              @click="show('sign-up')"
            >
              Create an account
            </button>
            <button
              v-else-if="mode === 'sign-up'"
              type="button"
              class="text-white/90 underline-offset-4 hover:underline"
              @click="show('sign-in')"
            >
              Already have an account? Sign in
            </button>
            <button
              v-else
              type="button"
              class="text-white/90 underline-offset-4 hover:underline"
              @click="show('sign-in')"
            >
              Back to sign in
            </button>
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.auth-fields :deep(input):-webkit-autofill,
.auth-fields :deep(input):-webkit-autofill:hover,
.auth-fields :deep(input):-webkit-autofill:focus,
.auth-fields :deep(input):-webkit-autofill:active {
  -webkit-text-fill-color: #fff;
  caret-color: #fff;
  border-radius: 9999px;
  transition: background-color 99999s ease-out;
  box-shadow: 0 0 0 1000px #245352 inset;
}
</style>
