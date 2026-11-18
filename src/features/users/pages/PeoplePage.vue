<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { staffRoleLabels } from '@/features/verification/rules'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useStaff } from '@/features/authentication/staffAccess'
import { api, errorMessage } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import { usePasswordConfirm } from '@/lib/usePasswordConfirm'
import type { PersonRow, StaffRole } from '@/types/api'

const { user, isAdmin, refresh } = useStaff()
const pw = usePasswordConfirm()
const query = ref('')
const people = ref<PersonRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function search() {
  loading.value = true
  error.value = null
  try {
    people.value = (await api.get<{ data: PersonRow[] }>('/admin/users', { params: { q: query.value } })).data.data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(search)

const pending = ref<{ person: PersonRow; role: StaffRole; grant: boolean } | null>(null)
const busy = ref(false)
const done = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function applyRole() {
  if (!pending.value) return
  const { person, role, grant } = pending.value
  busy.value = true
  actionError.value = null
  try {
    await pw.run(() => (grant ? api.post(`/admin/users/${person.id}/roles`, { role }) : api.delete(`/admin/users/${person.id}/roles/${role}`)))
    done.value = `${person.display_name} ${grant ? 'is now' : 'is no longer'} ${staffRoleLabels[role].toLowerCase()}.`
    if (person.id === user.value?.id) await refresh()
    await search()
  } catch (e) {
    actionError.value = errorMessage(e)
  } finally {
    busy.value = false
    pending.value = null
  }
}

const suspending = ref<PersonRow | null>(null)
const susp = reactive({ until: '', reason: '' })
async function suspend() {
  if (!suspending.value) return
  actionError.value = null
  try {
    await api.post(`/admin/users/${suspending.value.id}/suspension`, { until: new Date(susp.until).toISOString(), reason: susp.reason })
    done.value = `${suspending.value.display_name} is suspended until ${formatDay(susp.until)}. Their sessions were ended.`
    suspending.value = null
    await search()
  } catch (e) {
    actionError.value = errorMessage(e)
  }
}
async function lift(p: PersonRow) {
  try {
    await api.delete(`/admin/users/${p.id}/suspension`)
    done.value = `Suspension lifted for ${p.display_name}.`
    await search()
  } catch (e) {
    actionError.value = errorMessage(e)
  }
}
const roleList: StaffRole[] = ['moderator', 'admin']
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">People</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Find riders and staff, suspend accounts that break the rules, and (administrators) manage staff roles. Every change is in the audit log; the last administrator cannot be removed.
    </p>
    <form class="mt-6 flex max-w-xl items-end gap-2" role="search" @submit.prevent="search">
      <div class="field flex-1">
        <label for="q">Find people by name or username{{ isAdmin ? ' or email' : '' }}</label>
        <div class="relative">
          <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input id="q" v-model="query" type="search" class="input pl-9" autocomplete="off" />
        </div>
      </div>
      <button type="submit" class="btn btn-quiet">Search</button>
    </form>
    <p v-if="done" class="mt-4 text-sm text-success" role="status">{{ done }}</p>
    <p v-if="actionError" class="mt-4 rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">{{ actionError }}</p>

    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="search">People could not be loaded.</StatusLine>
    <StatusLine v-else-if="!people.length" state="empty">No one matches.</StatusLine>
    <div v-else class="relative mt-6 overflow-x-auto">
      <table class="w-full min-w-[48rem] border-collapse text-left text-sm">
        <caption class="sr-only">People and their roles (up to 50)</caption>
        <thead>
          <tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase">
            <th scope="col" class="py-2 pr-4 font-semibold">Person</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Joined</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Roles</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Account</th>
            <th scope="col" class="py-2 font-semibold"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in people" :key="p.id" class="border-b border-line align-top">
            <td class="py-3 pr-4">
              <span class="font-semibold">{{ p.display_name }}</span><span v-if="p.id === user?.id" class="text-muted"> (you)</span>
              <span class="block text-xs text-muted">{{ p.email ?? (p.username ? `@${p.username}` : '') }}</span>
            </td>
            <td class="tabular py-3 pr-4">{{ formatDay(p.joined_at) }}</td>
            <td class="py-3 pr-4">{{ p.roles.length ? p.roles.map((r) => staffRoleLabels[r]).join(', ') : 'Rider' }}</td>
            <td class="py-3 pr-4">
              <template v-if="p.suspended_until">Suspended until {{ formatDay(p.suspended_until) }}<span class="block text-xs text-muted">{{ p.suspension_reason }}</span></template>
              <template v-else>{{ p.email_verified ? 'Active' : 'Email not confirmed' }}</template>
            </td>
            <td class="py-3">
              <div class="flex flex-wrap justify-end gap-2">
                <template v-if="isAdmin">
                  <template v-for="r in roleList" :key="r">
                    <button v-if="p.roles.includes(r)" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Remove ${staffRoleLabels[r].toLowerCase()} role from ${p.display_name}`" @click="pending = { person: p, role: r, grant: false }">Remove {{ staffRoleLabels[r].toLowerCase() }}</button>
                    <button v-else type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Make ${p.display_name} ${staffRoleLabels[r].toLowerCase()}`" @click="pending = { person: p, role: r, grant: true }">Make {{ staffRoleLabels[r].toLowerCase() }}</button>
                  </template>
                </template>
                <button v-if="p.suspended_until" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" @click="lift(p)">Lift suspension</button>
                <button v-else-if="p.id !== user?.id" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Suspend ${p.display_name}`" @click="(suspending = p), Object.assign(susp, { until: '', reason: '' })">Suspend</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog :open="!!pending" :title="pending ? `${pending.grant ? 'Give' : 'Remove'} ${staffRoleLabels[pending.role].toLowerCase()} role?` : ''" :confirm-label="pending?.grant ? 'Give role' : 'Remove role'" :danger="!pending?.grant" :busy="busy" @confirm="applyRole" @cancel="pending = null">
      <template v-if="pending">
        {{ pending.person.display_name }} {{ pending.grant ? 'will be able to' : 'will no longer be able to' }}
        {{ pending.role === 'admin' ? 'manage roles, decide organizer and expert claims and read the full audit log' : 'review claims and contributions and edit content' }}. They will be signed out and sign in again with the new rights.
      </template>
    </ConfirmDialog>

    <ConfirmDialog :open="!!suspending" :title="suspending ? `Suspend ${suspending.display_name}?` : ''" confirm-label="Suspend" danger @confirm="suspend" @cancel="suspending = null">
      <div class="grid gap-3 text-ink">
        <p class="text-muted">They can still read and plan, but cannot contribute, apply or join events. Their sessions end now.</p>
        <div class="field"><label for="su">Until</label><input id="su" v-model="susp.until" type="date" class="input" /></div>
        <div class="field"><label for="sr">Reason (kept in the audit log)</label><textarea id="sr" v-model="susp.reason" class="input" rows="2" maxlength="500" /></div>
      </div>
    </ConfirmDialog>

    <ConfirmDialog :open="pw.asking.value" title="Confirm your password" confirm-label="Confirm" @confirm="pw.confirm" @cancel="pw.cancel">
      <div class="grid gap-2 text-ink">
        <p class="text-muted">Role changes need your password again.</p>
        <label for="cpw" class="text-sm font-semibold">Password</label>
        <input id="cpw" v-model="pw.password.value" type="password" class="input" autocomplete="current-password" @keydown.enter.prevent="pw.confirm" />
        <p v-if="pw.error.value" class="field-error" role="alert">{{ pw.error.value }}</p>
      </div>
    </ConfirmDialog>
  </div>
</template>
