<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import PasswordConfirmDialog from '@/components/ui/PasswordConfirmDialog.vue'
import { useStaff } from '@/features/authentication/staffAccess'
import { errorMessage } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import { usePasswordConfirm } from '@/lib/usePasswordConfirm'
import type { RoleRow, StaffRole } from '@/types/api'
import InviteStaffPanel from '../components/InviteStaffPanel.vue'
import { grantRole, listRoles, listStaff, revokeRole, revokeStaffSessions, sendStaffReset, setStaffActive } from '../services/staff'
import type { StaffRow } from '../types'

// Staff accounts (separate from rider accounts): roles, activation, staff password links, sessions, invitations.
const { user, can, refresh } = useStaff()
const pw = usePasswordConfirm()
const staff = ref<StaffRow[]>([])
const roles = ref<RoleRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const done = ref<string | null>(null)
const actionError = ref<string | null>(null)
const roleName = (slug: string) => roles.value.find((r) => r.slug === slug)?.name ?? slug.replaceAll('_', ' ')

async function load() {
  loading.value = true
  error.value = null
  try {
    staff.value = await listStaff()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(() => Promise.all([load(), listRoles().then((r) => (roles.value = r)).catch(() => {})]))

async function act(fn: () => Promise<unknown>, message: () => string) {
  actionError.value = null
  try {
    await fn()
    done.value = message()
    await load()
  } catch (e) {
    actionError.value = errorMessage(e)
  }
}

const pending = ref<{ person: StaffRow; role: StaffRole; grant: boolean } | null>(null)
const busy = ref(false)
async function applyRole() {
  if (!pending.value) return
  const { person, role, grant } = pending.value
  busy.value = true
  await act(() => pw.run(() => (grant ? grantRole(person.id, role) : revokeRole(person.id, role))), () => `${person.display_name} ${grant ? 'is now' : 'is no longer'} ${roleName(role).toLowerCase()}.`)
  if (person.id === user.value?.id) await refresh()
  busy.value = false
  pending.value = null
}

const deactivating = ref<StaffRow | null>(null)
const deactivateReason = ref('')
async function deactivate() {
  const s = deactivating.value
  if (!s) return
  await act(() => setStaffActive(s.id, false, deactivateReason.value), () => `${s.display_name} is deactivated and was signed out.`)
  if (!actionError.value) deactivating.value = null
}
const revoked = ref(0)
const canManage = computed(() => can('users.manage_staff'))
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Staff</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Staff accounts sign in only to this portal, with their own password. Give or remove roles, deactivate accounts, send a staff password link or sign someone out everywhere. The last active administrator cannot be removed. Every change is in the audit log.
    </p>
    <p v-if="done" class="mt-4 text-sm text-success" role="status">{{ done }}</p>
    <p v-if="actionError" class="mt-4 rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">{{ actionError }}</p>

    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Staff accounts could not be loaded.</StatusLine>
    <StatusLine v-else-if="!staff.length" state="empty">No staff accounts.</StatusLine>
    <div v-else class="relative mt-6 overflow-x-auto">
      <table class="w-full min-w-[48rem] border-collapse text-left text-sm">
        <caption class="sr-only">Staff accounts and their roles</caption>
        <thead>
          <tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase">
            <th scope="col" class="py-2 pr-4 font-semibold">Staff member</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Roles</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Account</th>
            <th scope="col" class="py-2 font-semibold"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in staff" :key="s.id" class="border-b border-line align-top">
            <td class="py-3 pr-4">
              <span class="font-semibold">{{ s.display_name }}</span><span v-if="s.id === user?.id" class="text-muted"> (you)</span>
              <span class="block text-xs text-muted">{{ s.email }}</span>
            </td>
            <td class="py-3 pr-4">{{ s.roles.length ? s.roles.map(roleName).join(', ') : 'No role' }}</td>
            <td class="py-3 pr-4">
              <template v-if="s.deactivated_at">Deactivated {{ formatDay(s.deactivated_at) }}</template>
              <template v-else-if="!s.has_password">Has not set a staff password yet</template>
              <template v-else>{{ s.last_login_at ? `Last signed in ${formatDay(s.last_login_at)}` : 'Never signed in' }}</template>
            </td>
            <td class="py-3">
              <div class="flex flex-wrap justify-end gap-2">
                <template v-if="can('users.roles.manage')">
                  <template v-for="r in roles" :key="r.slug">
                    <button v-if="s.roles.includes(r.slug)" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Remove ${r.name.toLowerCase()} role from ${s.display_name}`" @click="pending = { person: s, role: r.slug, grant: false }">Remove {{ r.name.toLowerCase() }}</button>
                    <button v-else type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Make ${s.display_name} ${r.name.toLowerCase()}`" @click="pending = { person: s, role: r.slug, grant: true }">Make {{ r.name.toLowerCase() }}</button>
                  </template>
                </template>
                <template v-if="canManage && s.id !== user?.id">
                  <button v-if="can('users.password_reset')" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Send ${s.display_name} a staff password link`" @click="act(() => sendStaffReset(s.id), () => `A staff password link was sent to ${s.display_name}'s email address.`)">Send password link</button>
                  <button v-if="can('users.sessions.revoke')" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Sign ${s.display_name} out everywhere`" @click="act(async () => (revoked = await revokeStaffSessions(s.id)), () => `${s.display_name} was signed out of ${revoked} ${revoked === 1 ? 'session' : 'sessions'}.`)">Sign out everywhere</button>
                  <template v-if="can('users.activate')">
                    <button v-if="s.deactivated_at" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Reactivate ${s.display_name}`" @click="act(() => setStaffActive(s.id, true, null), () => `${s.display_name} can sign in again.`)">Reactivate</button>
                    <button v-else type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Deactivate ${s.display_name}`" @click="(deactivating = s), (deactivateReason = '')">Deactivate</button>
                  </template>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog :open="!!pending" :title="pending ? `${pending.grant ? 'Give' : 'Remove'} ${roleName(pending.role).toLowerCase()} role?` : ''" :confirm-label="pending?.grant ? 'Give role' : 'Remove role'" :danger="!pending?.grant" :busy="busy" @confirm="applyRole" @cancel="pending = null">
      <template v-if="pending">
        {{ pending.person.display_name }} {{ pending.grant ? 'gets' : 'loses' }} what this role allows
        ({{ pending.role === 'admin' ? 'every permission' : `${roles.find((r) => r.slug === pending!.role)?.permissions.length ?? 0} permissions` }}). They will be signed out and sign in again with the new rights.
      </template>
    </ConfirmDialog>
    <ConfirmDialog :open="!!deactivating" :title="deactivating ? `Deactivate ${deactivating.display_name}?` : ''" confirm-label="Deactivate" danger @confirm="deactivate" @cancel="deactivating = null">
      <div class="grid gap-3 text-ink">
        <p class="text-muted">They are signed out now and cannot sign in to the staff portal until someone reactivates the account. Their rider account, if they have one, is not affected.</p>
        <div class="field"><label for="dr">Reason (kept in the audit log)</label><textarea id="dr" v-model="deactivateReason" class="input" rows="2" maxlength="500" /></div>
      </div>
    </ConfirmDialog>

    <InviteStaffPanel v-if="can('users.invite') && roles.length" :roles="roles" :pw="pw" @done="(m) => (done = m)" />
    <PasswordConfirmDialog :pw="pw" reason="Changing who has staff rights needs your staff password again." />
  </div>
</template>
