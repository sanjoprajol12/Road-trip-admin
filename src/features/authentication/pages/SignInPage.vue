<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { signIn, useStaff } from '../staffAccess'
import { errorMessage } from '@/lib/api/client'
import { safeNext } from '@/lib/safeNext'

const route = useRoute()
const router = useRouter()
const { access } = useStaff()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = null
  try {
    await signIn(email.value.trim(), password.value)
    await router.replace(access.value === 'ok' ? safeNext(route.query.next, '/') : '/no-access')
  } catch (e) {
    error.value = errorMessage(e).replace('These credentials do not match a staff account.', 'Email or password is incorrect.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-paper px-4 py-12">
    <div class="w-full max-w-sm">
      <p class="label text-crimson">My Ride Nepal Admin</p>
      <h1 class="display mt-2 text-5xl">Staff sign in</h1>
      <p class="mt-3 text-sm text-muted">Staff accounts only, with your staff password. A rider account from the public website does not sign in here.</p>
      <form class="mt-8 grid gap-5" @submit.prevent="submit">
        <p v-if="error" role="alert" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger">{{ error }}</p>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" v-model="email" type="email" class="input" autocomplete="username" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" v-model="password" type="password" class="input" autocomplete="current-password" required />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="busy || !email || !password" :aria-busy="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      </form>
      <p class="mt-6 text-sm"><RouterLink to="/forgot-password" class="link font-semibold">Forgot your staff password?</RouterLink></p>
    </div>
  </div>
</template>
