<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, ShieldAlert } from 'lucide-vue-next'
import { decisionLabel, expertScopes, needsReason, reasonError, verificationKindLabels, verificationStatusLabels, type ExpertScope, type VerificationStatus } from '../rules'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useStaff } from '@/features/authentication/staffAccess'
import { errorMessage, statusOf } from '@/lib/api/client'
import { formatDay, formatDayTime } from '@/lib/format'
import type { ClaimDetail, HistoryEntry } from '@/types/api'
import { decideClaim, getClaim } from '../services/verifications'

const props = defineProps<{ id: string }>()
const { user } = useStaff()
const claim = ref<ClaimDetail | null>(null)
const history = ref<HistoryEntry[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await getClaim<ClaimDetail, HistoryEntry>(props.id)
    claim.value = data.data
    history.value = data.history
  } catch (e) {
    if (statusOf(e) === 404) claim.value = null
    else error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const scopeLabel = (s: string) => expertScopes[s as ExpertScope] ?? s
const ownClaim = computed(() => claim.value?.user?.id === user.value?.id)

const choice = ref<VerificationStatus | null>(null)
const note = ref('')
const touched = ref(false)
const confirming = ref(false)
const busy = ref(false)
const decideError = ref<string | null>(null)
const noteError = computed(() => (choice.value && claim.value ? reasonError(choice.value, note.value.trim(), claim.value.review_note) : null))

function pick(to: VerificationStatus) {
  choice.value = to
  note.value = ''
  touched.value = false
  decideError.value = null
}
function askConfirm() {
  touched.value = true
  if (!noteError.value) confirming.value = true
}
async function confirmDecision() {
  if (!claim.value || !choice.value) return
  busy.value = true
  decideError.value = null
  try {
    await decideClaim(claim.value.id, choice.value, note.value.trim() || null)
    confirming.value = false
    choice.value = null
    await load()
  } catch (e) {
    confirming.value = false
    decideError.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
const describe = (h: HistoryEntry) =>
  h.action === 'verification.applied' ? 'Applied' : h.from && h.to && h.from !== h.to ? `${verificationStatusLabels[h.from as VerificationStatus] ?? h.from} → ${verificationStatusLabels[h.to as VerificationStatus] ?? h.to}` : 'Note changed'
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <RouterLink to="/verification" class="link inline-flex items-center gap-1.5 text-sm font-semibold"><ArrowLeft class="size-4" aria-hidden="true" /> Verification queue</RouterLink>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">This claim could not be loaded.</StatusLine>
    <StatusLine v-else-if="!claim" state="empty">No claim with this id.</StatusLine>
    <div v-else class="mt-6 grid gap-10 xl:grid-cols-[1fr_22rem]">
      <div class="min-w-0">
        <p class="label text-muted">{{ verificationStatusLabels[claim.status] }}</p>
        <h1 class="display mt-2 text-4xl">{{ verificationKindLabels[claim.kind] }}<span v-if="claim.scope">: {{ scopeLabel(claim.scope) }}</span></h1>
        <p class="mt-2 text-sm text-muted">{{ claim.applicant.display_name }}<template v-if="claim.applicant.username"> (@{{ claim.applicant.username }})</template> · applied {{ formatDayTime(claim.created_at) }}</p>

        <section class="mt-8" aria-labelledby="stmt-title">
          <h2 id="stmt-title" class="text-sm font-bold">Rider's statement</h2>
          <p class="mt-2 max-w-prose rounded-md border border-line bg-surface p-4 whitespace-pre-line">{{ claim.statement }}</p>
          <p class="mt-2 text-xs text-muted">The rider's own words, shown unedited. Approval verifies this claim only.</p>
        </section>

        <section class="mt-10" aria-labelledby="decide-title">
          <h2 id="decide-title" class="text-sm font-bold">Decision</h2>
          <p v-if="ownClaim" class="mt-2 flex gap-2 text-sm"><ShieldAlert class="size-4 text-warning" aria-hidden="true" /> You cannot review your own claim.</p>
          <p v-else-if="!claim.can_decide" class="mt-2 flex gap-2 text-sm"><ShieldAlert class="size-4 shrink-0 text-warning" aria-hidden="true" /> Only administrators decide organizer and expert claims.</p>
          <p v-else-if="!claim.next.length" class="mt-2 text-sm text-muted">{{ verificationStatusLabels[claim.status] }} is final. The rider can apply again.</p>
          <template v-else>
            <p v-if="decideError" role="alert" class="mt-3 rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger">{{ decideError }}</p>
            <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Choose a decision">
              <button v-for="to in claim.next" :key="to" type="button" class="btn" :class="choice === to ? 'bg-ink text-surface' : 'btn-quiet'" :aria-pressed="choice === to" @click="pick(to)">
                {{ decisionLabel(claim.status, to) }}
              </button>
            </div>
            <form v-if="choice" class="mt-4 grid max-w-xl gap-3" novalidate @submit.prevent="askConfirm">
              <div class="field">
                <label for="note">{{ needsReason(choice) ? 'Reason (shown to the rider)' : 'Note for the rider (optional)' }}</label>
                <textarea id="note" v-model="note" class="input" rows="3" maxlength="2000" :aria-invalid="touched && !!noteError" aria-describedby="note-hint" />
                <p id="note-hint" :class="touched && noteError ? 'field-error' : 'field-hint'">{{ (touched && noteError) || 'Kept in the audit history.' }}</p>
              </div>
              <button type="submit" class="btn btn-primary justify-self-start">Continue</button>
            </form>
          </template>
        </section>

        <section class="mt-10" aria-labelledby="history-title">
          <h2 id="history-title" class="text-sm font-bold">History</h2>
          <ol class="mt-3 border-l-2 border-line-strong">
            <li v-for="h in history" :key="h.id" class="relative pb-5 pl-5">
              <span class="absolute top-1.5 -left-[5px] size-2 rounded-full bg-crimson" aria-hidden="true" />
              <p class="text-sm font-semibold">{{ describe(h) }}</p>
              <p class="text-xs text-muted">{{ h.actor ?? 'System' }} · {{ formatDayTime(h.created_at) }}</p>
              <p v-if="h.note" class="mt-1 text-sm">“{{ h.note }}”</p>
            </li>
          </ol>
        </section>
      </div>

      <aside class="grid content-start gap-6 text-sm" aria-label="About the rider">
        <div class="rounded-md border border-line bg-surface p-4">
          <h2 class="font-bold">{{ claim.applicant.display_name }}</h2>
          <dl class="mt-2 grid gap-1 text-muted">
            <div v-if="claim.applicant.home_city"><dt class="inline">Home city: </dt><dd class="inline">{{ claim.applicant.home_city }}</dd></div>
            <div><dt class="inline">Joined: </dt><dd class="inline">{{ formatDay(claim.applicant.joined) }}</dd></div>
          </dl>
          <p v-if="claim.applicant.bio" class="mt-3">{{ claim.applicant.bio }}</p>
        </div>
        <div>
          <h2 class="font-bold">All claims by this rider</h2>
          <ul class="mt-2 grid gap-1">
            <li v-for="o in claim.other_claims" :key="o.id" class="flex justify-between gap-3 border-b border-line py-1.5">
              <RouterLink v-if="o.id !== claim.id" :to="`/verification/${o.id}`" class="link">{{ verificationKindLabels[o.kind] }}<template v-if="o.scope">: {{ scopeLabel(o.scope) }}</template></RouterLink>
              <span v-else class="font-semibold">{{ verificationKindLabels[o.kind] }}<template v-if="o.scope">: {{ scopeLabel(o.scope) }}</template> (this)</span>
              <span class="text-muted">{{ verificationStatusLabels[o.status] }}</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <ConfirmDialog
      :open="confirming"
      :title="claim && choice ? `${decisionLabel(claim.status, choice)} this claim?` : ''"
      :confirm-label="claim && choice ? decisionLabel(claim.status, choice) : ''"
      :danger="!!choice && needsReason(choice)"
      :busy="busy"
      @confirm="confirmDecision"
      @cancel="confirming = false"
    >
      <template v-if="claim && choice">
        {{ claim.applicant.display_name }} will see the new status<template v-if="note.trim()"> and your note</template>.
        <template v-if="choice === 'suspended' || choice === 'revoked'"> Their rights from this claim stop immediately.</template>
      </template>
    </ConfirmDialog>
  </div>
</template>
