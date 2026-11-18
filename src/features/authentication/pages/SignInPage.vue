<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStaff } from '../staffAccess'
import { db, errorMessage } from '@/lib/supabase/client'

const route = useRoute()
const router = useRouter()
const { refresh, access } = useStaff()
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = null
  try {
    const { error: e } = await db().auth.signInWithPassword({ email: email.value.trim(), password: password.value })
    if (e) throw e.status === 400 ? new Error('Email or password is incorrect.') : e
    await refresh()
    const next = typeof route.query.next === 'string' && /^\/(?![/\\])/.test(route.query.next) ? route.query.next : '/'
    await router.replace(access.value === 'ok' ? next : '/no-access')
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
      <h1 class="display mt-2 text-5xl">Staff sign in</h1>
      <p class="mt-3 text-sm text-muted">For moderators and administrators. Rider accounts without a staff role cannot open this app.</p>
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
        <button type="submit" class="btn btn-primary" :disabled="busy || !email || !password" :aria-busy="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </div>
  </div>
</template>
