<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CircleCheck } from 'lucide-vue-next'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { resetPassword } from '../services/auth'

// Opened from a staff password email. The server checks the token, its expiry and the address.
const route = useRoute()
const token = String(route.query.token ?? '')
const email = String(route.query.email ?? '')
const password = ref('')
const confirmation = ref('')
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const busy = ref(false)
const done = ref(false)
async function submit() {
  busy.value = true
  errors.value = {}
  error.value = null
  try {
    await resetPassword({ token, email, password: password.value, password_confirmation: confirmation.value })
    done.value = true
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = errors.value.email ?? (Object.keys(errors.value).length ? null : errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-paper px-4 py-12">
    <div class="w-full max-w-sm">
      <p class="label text-crimson">My Ride Nepal Admin</p>
      <h1 class="display mt-2 text-5xl">New staff password</h1>
      <div v-if="done" class="mt-8 grid gap-4" role="status">
        <p class="flex items-center gap-2 text-success"><CircleCheck class="size-5" aria-hidden="true" /> Your staff password is set. Other staff sessions were signed out.</p>
        <RouterLink to="/sign-in" class="btn btn-primary">Sign in</RouterLink>
      </div>
      <p v-else-if="!token || !email" class="mt-8 rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">
        This page needs the link from the email. <RouterLink to="/forgot-password" class="link font-semibold">Ask for a new link</RouterLink>.
      </p>
      <form v-else class="mt-8 grid gap-5" novalidate @submit.prevent="submit">
        <p class="text-sm text-muted">For the staff account <span class="font-semibold text-ink">{{ email }}</span>.</p>
        <p v-if="error" role="alert" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger">{{ error }} <RouterLink to="/forgot-password" class="link font-semibold">Ask for a new link</RouterLink>.</p>
        <div class="field">
          <label for="pw">New staff password <span class="font-normal text-muted">(at least 12 characters)</span></label>
          <input id="pw" v-model="password" type="password" class="input" autocomplete="new-password" minlength="12" :aria-invalid="!!errors.password" />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>
        <div class="field"><label for="pw2">Repeat it</label><input id="pw2" v-model="confirmation" type="password" class="input" autocomplete="new-password" /></div>
        <button type="submit" class="btn btn-primary" :disabled="busy || password.length < 12 || !confirmation" :aria-busy="busy">{{ busy ? 'Saving…' : 'Set password' }}</button>
      </form>
    </div>
  </div>
</template>
