<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const step = ref<'start' | 'finish'>(token.value ? 'start' : 'finish')
const temporaryPassword = ref('')
const code = ref<string[]>(['', '', '', '', '', ''])
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const pending = ref(false)
const otp = computed(() => code.value.join(''))

function notify(title: string, color: 'success' | 'error' | 'warning' = 'success') {
  toast.add({ title, color })
}

function text(caught: unknown) {
  if (caught && typeof caught === 'object' && 'data' in caught && caught.data && typeof caught.data === 'object' && 'statusMessage' in caught.data) {
    return String(caught.data.statusMessage)
  }
  return 'Activation failed.'
}

function statusOf(caught: unknown) {
  if (!caught || typeof caught !== 'object') return 0
  if ('statusCode' in caught && typeof caught.statusCode === 'number') return caught.statusCode
  if ('status' in caught && typeof caught.status === 'number') return caught.status
  return 0
}

async function sendCode(quietCooldown = false) {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/auth/otp/send', {
      method: 'POST',
      body: { purpose: 'ACTIVATION' }
    })
    notify('Verification code sent.')
  } catch (caught) {
    if (quietCooldown && statusOf(caught) === 429) {
      notify('Check your email for the verification code.', 'warning')
      return
    }
    error.value = text(caught)
    notify(error.value, 'error')
  } finally {
    pending.value = false
  }
}

async function start() {
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/auth/activate', {
      method: 'POST',
      body: { token: token.value, temporaryPassword: temporaryPassword.value }
    })
    step.value = 'finish'
    notify('Verification code sent.')
  } catch (caught) {
    error.value = text(caught)
    notify(error.value, 'error')
  } finally {
    pending.value = false
  }
}

async function finish() {
  error.value = ''
  if (otp.value.length < 6) {
    notify('Enter the verification code.', 'error')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    notify('Passwords do not match.', 'error')
    return
  }
  pending.value = true
  try {
    await $fetch('/api/auth/activate', {
      method: 'POST',
      body: { otp: otp.value, newPassword: newPassword.value, confirmPassword: confirmPassword.value }
    })
    notify('Password updated. Sign in with your new password.')
    await navigateTo('/admin/login')
  } catch (caught) {
    error.value = text(caught)
    notify(error.value, 'error')
  } finally {
    pending.value = false
  }
}

onMounted(() => {
  if (!token.value) sendCode(true)
})
</script>

<template>
  <section class="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
    <img
      src="/logo.jpg"
      alt=""
      width="96"
      height="96"
      class="mx-auto h-24 w-24 rounded-2xl object-cover"
    >
    <h1 class="mt-6 text-center font-display text-4xl text-ink">
      {{ step === 'start' ? 'Activate your account' : 'Set a new password' }}
    </h1>
    <form
      v-if="step === 'start'"
      class="mt-6 space-y-4"
      @submit.prevent="start"
    >
      <UFormField
        label="Temporary password"
        required
      >
        <UInput
          v-model="temporaryPassword"
          type="password"
          class="w-full"
          autocomplete="current-password"
        />
      </UFormField>
      <UButton
        type="submit"
        block
        :loading="pending"
      >
        Send verification code
      </UButton>
    </form>
    <form
      v-else
      class="mt-6 space-y-4"
      @submit.prevent="finish"
    >
      <UFormField
        label="Email code"
        required
      >
        <UPinInput
          v-model="code"
          :length="6"
          otp
          type="number"
          autofocus
          class="justify-center"
        />
      </UFormField>
      <UFormField
        label="New password"
        required
      >
        <UInput
          v-model="newPassword"
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
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>
      <UButton
        type="submit"
        block
        :loading="pending"
      >
        Set password
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        block
        :loading="pending"
        @click="sendCode(false)"
      >
        Resend code
      </UButton>
    </form>
    <p
      v-if="error"
      class="mt-3 text-center text-sm text-danger-600"
      role="alert"
    >
      {{ error }}
    </p>
  </section>
</template>
