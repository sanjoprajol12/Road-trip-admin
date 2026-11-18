<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShieldX } from 'lucide-vue-next'
import { signOut, useStaff } from '../staffAccess'

const router = useRouter()
const { user } = useStaff()

async function switchAccount() {
  await signOut()
  await router.replace('/sign-in')
}
</script>

<template>
  <div class="grid min-h-svh place-items-center bg-paper px-4 py-12">
    <div class="w-full max-w-md" role="alert">
      <ShieldX class="size-8 text-danger" aria-hidden="true" />
      <h1 class="display mt-4 text-5xl">No staff access</h1>
      <p class="mt-3 text-muted">
        <template v-if="user">{{ user.email }} is a rider account without a moderator or administrator role.</template>
        <template v-else>You are not signed in.</template>
        An administrator can grant a role if you need one.
      </p>
      <button type="button" class="btn btn-quiet mt-6" @click="switchAccount">{{ user ? 'Sign in with another account' : 'Go to sign in' }}</button>
    </div>
  </div>
</template>
