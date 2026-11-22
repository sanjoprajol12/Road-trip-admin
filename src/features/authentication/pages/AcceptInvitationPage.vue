<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CircleCheck } from 'lucide-vue-next'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { acceptInvitation } from '../services/auth'

// Opened from the invitation email. New staff choose a name and a staff password; people who already have a staff
// account confirm it with their staff password. A rider account is never used or changed here.
// The server checks the token, its expiry and the address.
const route = useRoute()
const token = String(route.query.token ?? '')
const email = String(route.query.email ?? '')
const hasAccount = ref(false)
const name = ref('')
const password = ref('')
const errors = ref<Record<string, string>>({})
const error = ref<string | null>(null)
const busy = ref(false)
const accepted = ref(false)

async function submit() {
  busy.value = true
  errors.value = {}
  error.value = null
  try {
    await acceptInvitation({ token, email, password: password.value, display_name: hasAccount.value ? null : name.value.trim() })
    accepted.value = true
  } catch (e) {
    errors.value = fieldErrors(e)
    error.value = errors.value.token ?? errors.value.email ?? (Object.keys(errors.value).length ? null : errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-paper px-4 py-12">
    <div class="w-full max-w-sm">
      <p class="label text-crimson">My Ride Nepal Admin</p>
      <h1 class="display mt-2 text-5xl">Join the staff</h1>
      <div v-if="accepted" class="mt-8 grid gap-4" role="status">
        <p class="flex items-center gap-2 text-success"><CircleCheck class="size-5" aria-hidden="true" /> Invitation accepted.</p>
        <RouterLink to="/sign-in" class="btn btn-primary">Sign in</RouterLink>
      </div>
      <p v-else-if="!token || !email" class="mt-8 rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">
        This page needs the link from your invitation email. Ask the person who invited you for a new one.
      </p>
      <form v-else class="mt-8 grid gap-5" novalidate @submit.prevent="submit">
        <p class="text-sm text-muted">Invitation for <span class="font-semibold text-ink">{{ email }}</span>.</p>
        <p v-if="error" role="alert" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger">{{ error }}</p>
        <fieldset class="grid gap-2 text-sm">
          <legend class="font-semibold">Do you already have a staff account with this email?</legend>
          <label class="flex items-center gap-2"><input v-model="hasAccount" type="radio" :value="false" /> No, create one</label>
          <label class="flex items-center gap-2"><input v-model="hasAccount" type="radio" :value="true" /> Yes</label>
          <span class="text-xs text-muted">A rider account on the public website is separate: it is not used here and keeps its own password.</span>
        </fieldset>
        <div v-if="!hasAccount" class="field">
          <label for="name">Name other people will see</label>
          <input id="name" v-model="name" class="input" maxlength="60" autocomplete="name" :aria-invalid="!!errors.display_name" />
          <p v-if="errors.display_name" class="field-error">{{ errors.display_name }}</p>
        </div>
        <div class="field">
          <label for="password">{{ hasAccount ? 'Your current staff password' : 'Choose a staff password (at least 8 characters)' }}</label>
          <input id="password" v-model="password" type="password" class="input" :autocomplete="hasAccount ? 'current-password' : 'new-password'" :aria-invalid="!!errors.password" />
          <p v-if="errors.password" class="field-error">{{ errors.password }}</p>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="busy || !password" :aria-busy="busy">{{ busy ? 'Accepting…' : 'Accept invitation' }}</button>
      </form>
    </div>
  </div>
</template>
