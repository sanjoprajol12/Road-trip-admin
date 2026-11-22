<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useStaff } from '@/features/authentication/staffAccess'
import { errorMessage } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import { liftSuspension, pauseContributions, reviewContributionPause, revokeRiderSessions, searchRiders, sendRiderReset, setRiderActive, suspendRider } from '../services/riders'
import type { RiderRow } from '../types'

// Rider accounts from the public website. Staff accounts are separate (Staff page); riders never hold staff roles.
const { can } = useStaff()
const query = ref('')
const riders = ref<RiderRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const done = ref<string | null>(null)
const actionError = ref<string | null>(null)

async function search() {
  loading.value = true
  error.value = null
  try {
    riders.value = await searchRiders(query.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(search)

/** Runs one account action, reports its result and reloads the list. */
async function act(fn: () => Promise<unknown>, message: () => string) {
  actionError.value = null
  try {
    await fn()
    done.value = message()
    await search()
  } catch (e) {
    actionError.value = errorMessage(e)
  }
}

const pausing = ref<RiderRow | null>(null)
const pause = reactive({ until: '', reason: '' })
async function pauseNow() {
  const r = pausing.value
  if (!r) return
  await act(() => pauseContributions(r.id, new Date(pause.until).toISOString(), pause.reason), () => `${r.display_name} cannot contribute until ${formatDay(pause.until)}. The rest of the account keeps working.`)
  if (!actionError.value) pausing.value = null
}
const reviewing = ref<RiderRow | null>(null)
const review = reactive({ decision: 'lifted' as 'lifted' | 'upheld', note: '' })
async function reviewNow() {
  const r = reviewing.value
  if (!r) return
  await act(() => reviewContributionPause(r.id, review.decision, review.note), () => (review.decision === 'lifted' ? `${r.display_name} can contribute again.` : `The pause for ${r.display_name} stays; they were told.`))
  if (!actionError.value) reviewing.value = null
}
const suspending = ref<RiderRow | null>(null)
const susp = reactive({ until: '', reason: '' })
async function suspend() {
  const r = suspending.value
  if (!r) return
  await act(() => suspendRider(r.id, new Date(susp.until).toISOString(), susp.reason), () => `${r.display_name} is suspended until ${formatDay(susp.until)}. Their sessions were ended.`)
  if (!actionError.value) suspending.value = null
}
const deactivating = ref<RiderRow | null>(null)
const deactivateReason = ref('')
async function deactivate() {
  const r = deactivating.value
  if (!r) return
  await act(() => setRiderActive(r.id, false, deactivateReason.value), () => `${r.display_name} is deactivated and was signed out.`)
  if (!actionError.value) deactivating.value = null
}
const revoked = ref(0)
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Riders</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Rider accounts from the public website. Suspend or deactivate accounts that break the rules, send a password link or sign a rider out everywhere. Staff accounts are managed on the Staff page. Every change is in the audit log.
    </p>
    <form class="mt-6 flex max-w-xl items-end gap-2" role="search" @submit.prevent="search">
      <div class="field flex-1">
        <label for="q">Find riders by name or username{{ can('users.emails.view') ? ' or email' : '' }}</label>
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
    <StatusLine v-else-if="error" state="error" :message="error" @retry="search">Riders could not be loaded.</StatusLine>
    <StatusLine v-else-if="!riders.length" state="empty">No rider matches.</StatusLine>
    <div v-else class="relative mt-6 overflow-x-auto">
      <table class="w-full min-w-[44rem] border-collapse text-left text-sm">
        <caption class="sr-only">Riders (up to 50)</caption>
        <thead>
          <tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase">
            <th scope="col" class="py-2 pr-4 font-semibold">Rider</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Joined</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Account</th>
            <th scope="col" class="py-2 font-semibold"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in riders" :key="r.id" class="border-b border-line align-top">
            <td class="py-3 pr-4">
              <span class="font-semibold">{{ r.display_name }}</span>
              <span class="block text-xs text-muted">{{ r.email ?? (r.username ? `@${r.username}` : '') }}</span>
            </td>
            <td class="tabular py-3 pr-4">{{ formatDay(r.joined_at) }}</td>
            <td class="py-3 pr-4">
              <template v-if="r.deactivated_at">Deactivated {{ formatDay(r.deactivated_at) }}</template>
              <template v-else-if="r.suspended_until">Suspended until {{ formatDay(r.suspended_until) }}<span class="block text-xs text-muted">{{ r.suspension_reason }}</span></template>
              <template v-else>{{ r.email_verified ? 'Active' : 'Email not confirmed' }}</template>
              <span v-if="r.contribution_suspension" class="block text-xs">Contributions paused until {{ formatDay(r.contribution_suspension.until) }}<template v-if="r.contribution_suspension.appealed_at && !r.contribution_suspension.appeal_decision">, <span class="font-semibold">appeal waiting</span></template></span>
              <span v-if="r.offences.rejected || r.offences.flagged" class="block text-xs font-semibold text-danger">{{ r.offences.rejected }} rejected, {{ r.offences.flagged }} flagged contributions</span>
            </td>
            <td class="py-3">
              <div class="flex flex-wrap justify-end gap-2">
                <button v-if="can('users.password_reset')" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Send ${r.display_name} a password reset link`" @click="act(() => sendRiderReset(r.id), () => `A password reset link was sent to ${r.display_name}'s email address.`)">Send reset link</button>
                <button v-if="can('users.sessions.revoke')" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Sign ${r.display_name} out everywhere`" @click="act(async () => (revoked = await revokeRiderSessions(r.id)), () => `${r.display_name} was signed out of ${revoked} ${revoked === 1 ? 'session' : 'sessions'}.`)">Sign out everywhere</button>
                <template v-if="can('users.activate')">
                  <button v-if="r.deactivated_at" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Reactivate ${r.display_name}`" @click="act(() => setRiderActive(r.id, true, null), () => `${r.display_name} can sign in again.`)">Reactivate</button>
                  <button v-else type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Deactivate ${r.display_name}`" @click="(deactivating = r), (deactivateReason = '')">Deactivate</button>
                </template>
                <template v-if="can('users.suspend')">
                  <button v-if="r.suspended_until" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" @click="act(() => liftSuspension(r.id), () => `Suspension lifted for ${r.display_name}.`)">Lift suspension</button>
                  <button v-else type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Suspend ${r.display_name}`" @click="(suspending = r), Object.assign(susp, { until: '', reason: '' })">Suspend</button>
                  <button v-if="r.contribution_suspension" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Review the contribution pause of ${r.display_name}`" @click="(reviewing = r), Object.assign(review, { decision: 'lifted', note: '' })">Review pause</button>
                  <button v-else type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Pause contributions of ${r.display_name}`" @click="(pausing = r), Object.assign(pause, { until: '', reason: '' })">Pause contributions</button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog :open="!!suspending" :title="suspending ? `Suspend ${suspending.display_name}?` : ''" confirm-label="Suspend" danger @confirm="suspend" @cancel="suspending = null">
      <div class="grid gap-3 text-ink">
        <p class="text-muted">They can still read and plan, but cannot contribute, apply or join events. Their sessions end now.</p>
        <div class="field"><label for="su">Until</label><input id="su" v-model="susp.until" type="date" class="input" /></div>
        <div class="field"><label for="sr">Reason (kept in the audit log)</label><textarea id="sr" v-model="susp.reason" class="input" rows="2" maxlength="500" /></div>
      </div>
    </ConfirmDialog>
    <ConfirmDialog :open="!!pausing" :title="pausing ? `Pause contributions of ${pausing.display_name}?` : ''" confirm-label="Pause contributions" danger @confirm="pauseNow" @cancel="pausing = null">
      <div class="grid gap-3 text-ink">
        <p class="text-muted">They keep their account, trips, saved items and events, but cannot submit, correct, confirm or report contributions. They see the reason and can appeal once.</p>
        <div class="field"><label for="pu">Until</label><input id="pu" v-model="pause.until" type="date" class="input" /></div>
        <div class="field"><label for="pr">Reason (shown to the rider and kept in the audit log)</label><textarea id="pr" v-model="pause.reason" class="input" rows="2" maxlength="500" /></div>
      </div>
    </ConfirmDialog>
    <ConfirmDialog :open="!!reviewing" :title="reviewing ? `Contribution pause of ${reviewing.display_name}` : ''" confirm-label="Apply decision" @confirm="reviewNow" @cancel="reviewing = null">
      <div v-if="reviewing?.contribution_suspension" class="grid gap-3 text-ink">
        <p><span class="font-semibold">Reason:</span> {{ reviewing.contribution_suspension.reason }}</p>
        <p v-if="reviewing.contribution_suspension.appeal"><span class="font-semibold">Their appeal:</span> {{ reviewing.contribution_suspension.appeal }}</p>
        <p v-else class="text-muted">No appeal yet. You can still lift the pause early.</p>
        <div class="field"><label for="rd">Decision</label><select id="rd" v-model="review.decision" class="input"><option value="lifted">Lift the pause now</option><option v-if="reviewing.contribution_suspension.appeal" value="upheld">Keep the pause (appeal refused)</option></select></div>
        <div class="field"><label for="rn">Note (kept in the audit log)</label><textarea id="rn" v-model="review.note" class="input" rows="2" maxlength="500" /></div>
      </div>
    </ConfirmDialog>
    <ConfirmDialog :open="!!deactivating" :title="deactivating ? `Deactivate ${deactivating.display_name}?` : ''" confirm-label="Deactivate" danger @confirm="deactivate" @cancel="deactivating = null">
      <div class="grid gap-3 text-ink">
        <p class="text-muted">They are signed out now and cannot sign in until someone reactivates the account. Nothing they wrote is deleted.</p>
        <div class="field"><label for="dr">Reason (kept in the audit log)</label><textarea id="dr" v-model="deactivateReason" class="input" rows="2" maxlength="500" /></div>
      </div>
    </ConfirmDialog>
  </div>
</template>
