<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { errorMessage } from '@/lib/api/client'
import { requestPasswordLink } from '../services/auth'

// Same answer whether or not the address has a staff account. Rider passwords are reset on the public website.
const email = ref('')
const sent = ref(false)
const error = ref<string | null>(null)
const busy = ref(false)
async function submit() {
  busy.value = true
  error.value = null
  try {
    await requestPasswordLink(email.value.trim())
    sent.value = true
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-paper px-4 py-12">
    <div class="w-full max-w-sm">
      <p class="label text-crimson">My Ride Nepal Admin</p>
      <h1 class="display mt-2 text-5xl">Staff password</h1>
      <p v-if="sent" class="mt-8 text-sm" role="status">If that address has a staff account, a link to set a new password is on its way. It works once, for 30 minutes.</p>
      <form v-else class="mt-8 grid gap-5" @submit.prevent="submit">
        <p class="text-sm text-muted">We send a link to set a new staff password. This does not change a rider account on the public website.</p>
        <p v-if="error" role="alert" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger">{{ error }}</p>
        <div class="field"><label for="email">Email</label><input id="email" v-model="email" type="email" class="input" autocomplete="username" required /></div>
        <button type="submit" class="btn btn-primary" :disabled="busy || !email.trim()" :aria-busy="busy">{{ busy ? 'Sending…' : 'Send link' }}</button>
      </form>
      <p class="mt-6 text-sm"><RouterLink to="/sign-in" class="link font-semibold">Back to sign in</RouterLink></p>
    </div>
  </div>
</template>
