<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { errorMessage } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import type { usePasswordConfirm } from '@/lib/usePasswordConfirm'
import type { RoleRow, StaffInvitation } from '@/types/api'
import { listInvitations, sendInvitation, withdrawInvitation } from '../services/staff'

// New staff only come in by invitation: the link creates a separate staff account (never a rider account).
const props = defineProps<{ roles: RoleRow[]; pw: ReturnType<typeof usePasswordConfirm> }>()
const emit = defineEmits<{ done: [message: string] }>()

const invitations = ref<StaffInvitation[]>([])
const form = reactive({ email: '', roles: [] as string[], busy: false })
const error = ref<string | null>(null)
const roleName = (slug: string) => props.roles.find((r) => r.slug === slug)?.name ?? slug.replaceAll('_', ' ')

async function load() {
  try {
    invitations.value = await listInvitations()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
onMounted(load)

async function send() {
  form.busy = true
  error.value = null
  const email = form.email.trim()
  try {
    await props.pw.run(() => sendInvitation(email, form.roles))
    emit('done', `Invitation sent to ${email}. The link works for 72 hours.`)
    Object.assign(form, { email: '', roles: [] })
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    form.busy = false
  }
}
async function withdraw(i: StaffInvitation) {
  try {
    await withdrawInvitation(i.id)
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<template>
  <section class="mt-12 max-w-2xl border-t border-line pt-8" aria-labelledby="inv-title">
    <h2 id="inv-title" class="text-xl font-semibold">Invite staff</h2>
    <p class="mt-1 text-sm text-muted">They get an email with a link that works once, for 72 hours, and set a staff password of their own. A rider account with the same email stays separate. You can only invite into roles whose permissions you have.</p>
    <form class="mt-4 grid gap-4" @submit.prevent="send">
      <p v-if="error" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">{{ error }}</p>
      <div class="field"><label for="ie">Email address</label><input id="ie" v-model="form.email" type="email" class="input" autocomplete="off" required /></div>
      <fieldset class="grid gap-2">
        <legend class="text-sm font-semibold">Roles</legend>
        <label v-for="r in roles" :key="r.slug" class="flex items-center gap-2 text-sm"><input v-model="form.roles" type="checkbox" :value="r.slug" /> {{ r.name }}</label>
      </fieldset>
      <button type="submit" class="btn btn-primary justify-self-start" :disabled="form.busy || !form.email.trim() || !form.roles.length" :aria-busy="form.busy">{{ form.busy ? 'Sending…' : 'Send invitation' }}</button>
    </form>
    <h3 class="mt-8 text-sm font-semibold">Open invitations</h3>
    <p v-if="!invitations.length" class="mt-2 text-sm text-muted">None.</p>
    <ul v-else class="mt-2 grid border-t border-line text-sm" aria-label="Open invitations">
      <li v-for="i in invitations" :key="i.id" class="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2">
        <span><span class="font-semibold">{{ i.email }}</span> · {{ i.roles.map(roleName).join(', ') }} · expires {{ formatDay(i.expires_at) }}</span>
        <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Withdraw the invitation for ${i.email}`" @click="withdraw(i)">Withdraw</button>
      </li>
    </ul>
  </section>
</template>
