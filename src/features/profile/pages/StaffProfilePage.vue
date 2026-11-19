<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useStaff } from '@/features/authentication/staffAccess'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import { changePassword, linkRider, unlinkRider } from '../services/profile'

const { user, roles, refresh } = useStaff()

const pwForm = reactive({ current_password: '', password: '', password_confirmation: '' })
const pwErrors = ref<Record<string, string>>({})
const pwDone = ref<string | null>(null)
async function savePassword() {
  pwErrors.value = {}
  pwDone.value = null
  try {
    await changePassword({ ...pwForm })
    pwDone.value = 'Password changed. Your other staff sessions were signed out.'
    Object.assign(pwForm, { current_password: '', password: '', password_confirmation: '' })
  } catch (e) {
    pwErrors.value = fieldErrors(e)
    if (!Object.keys(pwErrors.value).length) pwErrors.value = { _: errorMessage(e) }
  }
}

// Linking only tells the system which rider account is yours, so you are never asked to review your own
// contributions or claims. It never signs you in on the public website or gives that rider account any staff right.
const link = reactive({ email: '', password: '' })
const linkError = ref<string | null>(null)
const linkDone = ref<string | null>(null)
async function saveLink() {
  linkError.value = null
  linkDone.value = null
  try {
    await linkRider(link.email.trim(), link.password)
    linkDone.value = 'Your rider account is linked.'
    Object.assign(link, { email: '', password: '' })
    await refresh()
  } catch (e) {
    linkError.value = errorMessage(e)
  }
}
async function removeLink() {
  linkError.value = null
  try {
    await unlinkRider()
    linkDone.value = 'The link to your rider account was removed.'
    await refresh()
  } catch (e) {
    linkError.value = errorMessage(e)
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Your staff account</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">{{ user?.display_name }} · {{ user?.email }} · {{ roles.join(', ') }}<template v-if="user?.last_login_at"> · signed in {{ formatDay(user.last_login_at) }}</template></p>

    <section class="mt-10 max-w-xl border-t border-line pt-6" aria-labelledby="pw-title">
      <h2 id="pw-title" class="text-xl font-semibold">Change staff password</h2>
      <form class="mt-4 grid gap-4" novalidate @submit.prevent="savePassword">
        <p v-if="pwErrors._" class="text-sm text-danger" role="alert">{{ pwErrors._ }}</p>
        <div class="field"><label for="cur">Current staff password</label><input id="cur" v-model="pwForm.current_password" type="password" class="input" autocomplete="current-password" :aria-invalid="!!pwErrors.current_password" /><p v-if="pwErrors.current_password" class="field-error">{{ pwErrors.current_password }}</p></div>
        <div class="field"><label for="new">New staff password <span class="font-normal text-muted">(at least 12 characters)</span></label><input id="new" v-model="pwForm.password" type="password" class="input" autocomplete="new-password" :aria-invalid="!!pwErrors.password" /><p v-if="pwErrors.password" class="field-error">{{ pwErrors.password }}</p></div>
        <div class="field"><label for="new2">Repeat it</label><input id="new2" v-model="pwForm.password_confirmation" type="password" class="input" autocomplete="new-password" /></div>
        <div class="flex items-center gap-3">
          <button type="submit" class="btn btn-primary" :disabled="!pwForm.current_password || pwForm.password.length < 12">Change password</button>
          <span v-if="pwDone" class="text-sm text-success" role="status">{{ pwDone }}</span>
        </div>
      </form>
    </section>

    <section class="mt-10 max-w-xl border-t border-line pt-6" aria-labelledby="link-title">
      <h2 id="link-title" class="text-xl font-semibold">Your rider account</h2>
      <p class="mt-1 text-sm text-muted">If you also ride and post on the public website, link that account so you are never asked to review your own contributions or claims. Linking never signs you in there and gives the rider account no staff rights. Reviews of rider content with your staff email are refused anyway.</p>
      <p v-if="linkError" class="mt-3 text-sm text-danger" role="alert">{{ linkError }}</p>
      <p v-if="linkDone" class="mt-3 text-sm text-success" role="status">{{ linkDone }}</p>
      <div v-if="user?.rider_linked" class="mt-4 flex items-center gap-3">
        <p class="text-sm">A rider account is linked.</p>
        <button type="button" class="btn btn-quiet" @click="removeLink">Remove link</button>
      </div>
      <form v-else class="mt-4 grid gap-4" novalidate @submit.prevent="saveLink">
        <div class="field"><label for="re">Rider account email</label><input id="re" v-model="link.email" type="email" class="input" autocomplete="off" /></div>
        <div class="field"><label for="rp">Rider account password</label><input id="rp" v-model="link.password" type="password" class="input" autocomplete="off" /></div>
        <button type="submit" class="btn btn-quiet justify-self-start" :disabled="!link.email.trim() || !link.password">Link rider account</button>
      </form>
    </section>
  </div>
</template>
