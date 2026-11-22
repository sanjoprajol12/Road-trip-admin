<script setup lang="ts">
import { reactive, ref, toRef } from 'vue'
import { CheckCheck, Flag, History, MessageSquareWarning, TriangleAlert, X } from 'lucide-vue-next'
import { errorMessage } from '@/lib/api/client'
import { formatDay, formatDayTime } from '@/lib/format'
import type { Contribution, ModerationEvent } from '@/types/api'
import { reportCategoryLabels, statusLabels } from '../labels'
import { confirmStillAccurate, decideContribution, dismissReport, moderationHistory, requestCorrection, reviewCorrection } from '../services/moderation'

// One contribution in the queue with every moderator action. Staff never edit what the rider wrote.
const props = defineProps<{ item: Contribution }>()
const emit = defineEmits<{ changed: [] }>()
const c = toRef(props, 'item')

const form = reactive({ status: '', note: '', source: '', sourceTitle: '' })
const busy = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

async function run(action: () => Promise<unknown>, done?: string, changes = true) {
  busy.value = true
  error.value = null
  try {
    await action()
    if (done) notice.value = done
    if (changes) emit('changed')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

const decide = () => run(() => decideContribution(c.value.id, { status: form.status, moderation_note: form.note || null, source_url: form.source || null, source_title: form.sourceTitle || null }))

const asking = ref(false)
const ask = ref('')
const sendRequest = () => run(async () => {
  await requestCorrection(c.value.id, ask.value)
  asking.value = false
}, 'The author was asked for a correction.')

const history = ref<ModerationEvent[] | null>(null)
async function toggleHistory() {
  if (history.value) return void (history.value = null)
  await run(async () => (history.value = await moderationHistory(c.value.id)), undefined, false)
}
</script>

<template>
  <li class="rounded-md border border-line bg-surface p-5">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <p class="label text-muted">{{ c.kind.replace('_', ' ') }} · {{ statusLabels[c.status] ?? c.status }}</p>
      <p v-if="c.dangerous" class="flex items-center gap-1 text-sm font-semibold text-danger"><TriangleAlert class="size-4" aria-hidden="true" /> Reported as dangerous</p>
      <p v-else-if="c.open_reports" class="flex items-center gap-1 text-sm font-semibold text-danger"><Flag class="size-4" aria-hidden="true" /> {{ c.open_reports }} open reports</p>
    </div>
    <h2 class="mt-1 text-xl font-bold">{{ c.title }}</h2>
    <p class="mt-1 text-sm text-muted">
      By {{ c.author?.display_name }} · observed {{ formatDay(c.observed_on) }} · sent {{ formatDay(c.submitted_at) }}
      <template v-if="c.last_confirmed_on"> · still accurate on {{ formatDay(c.last_confirmed_on) }}</template>
      <template v-if="c.segment"> · {{ c.route?.name }}: {{ c.segment.start_name }} to {{ c.segment.end_name }}</template>
      <template v-else-if="c.destination"> · {{ c.destination.name }}</template>
    </p>
    <p class="mt-3 max-w-prose whitespace-pre-line">{{ c.body }}</p>
    <dl v-if="Object.keys(c.details).length" class="mt-3 grid gap-1 text-sm sm:grid-cols-2">
      <div v-for="(v, k) in c.details" :key="k"><dt class="inline font-semibold">{{ String(k).replace('_', ' ') }}: </dt><dd class="inline">{{ v }}</dd></div>
    </dl>
    <div v-if="c.media?.length" class="mt-3 flex flex-wrap gap-2"><img v-for="m in c.media" :key="m.id" :src="m.url" :alt="m.alt" class="h-28 rounded-md object-cover" /></div>

    <div v-if="c.author_correction" class="mt-4 rounded-md border border-line p-3 text-sm">
      <p class="font-semibold">Author's correction, {{ formatDay(c.author_corrected_at) }}{{ c.correction_pending_review ? ' (waiting for review)' : '' }}</p>
      <p class="mt-1 whitespace-pre-line">{{ c.author_correction }}</p>
      <div v-if="c.correction_pending_review" class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary" :disabled="busy" @click="run(() => reviewCorrection(c.id, true))">Publish correction</button>
        <button type="button" class="btn btn-quiet" :disabled="busy" @click="run(() => reviewCorrection(c.id, false))">Decline</button>
      </div>
    </div>
    <p v-if="c.correction_request" class="mt-3 text-sm"><span class="font-semibold">Correction asked for:</span> {{ c.correction_request }}</p>

    <ul v-if="c.reports?.length" class="mt-3 grid gap-2 text-sm">
      <li v-for="r in c.reports" :key="r.id" class="flex flex-wrap items-start justify-between gap-2 border-l-2 pl-3" :class="r.category === 'dangerous' ? 'border-danger' : 'border-line'">
        <span><span class="font-semibold">{{ reportCategoryLabels[r.category] ?? r.category }}:</span> “{{ r.reason }}” <span class="text-muted">{{ formatDay(r.created_at) }}</span></span>
        <button type="button" class="link inline-flex items-center gap-1" :disabled="busy" @click="run(() => dismissReport(c.id, r.id))"><X class="size-4" aria-hidden="true" /> Dismiss report</button>
      </li>
    </ul>
    <p v-if="c.moderation_note" class="mt-3 text-sm"><span class="font-semibold">Current note:</span> {{ c.moderation_note }}</p>

    <form v-if="c.next_statuses?.length" class="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end" @submit.prevent="decide">
      <div class="field"><label :for="`st-${c.id}`">Decision</label><select :id="`st-${c.id}`" v-model="form.status" class="input"><option value="" disabled>Choose</option><option v-for="d in c.next_statuses" :key="d" :value="d">{{ statusLabels[d] }}</option></select></div>
      <div class="field"><label :for="`nt-${c.id}`">Note {{ ['rejected', 'flagged'].includes(form.status) ? '(required, shown to the author)' : '(optional)' }}</label><input :id="`nt-${c.id}`" v-model="form.note" class="input" maxlength="2000" /></div>
      <button type="submit" class="btn btn-primary" :disabled="!form.status || busy">Apply</button>
      <template v-if="form.status === 'officially_sourced'">
        <div class="field"><label :for="`stt-${c.id}`">Source title</label><input :id="`stt-${c.id}`" v-model="form.sourceTitle" class="input" maxlength="200" /></div>
        <div class="field sm:col-span-2"><label :for="`src-${c.id}`">Official source link</label><input :id="`src-${c.id}`" v-model="form.source" type="url" class="input" /></div>
      </template>
    </form>
    <p v-else class="mt-4 border-t border-line pt-4 text-sm text-muted">Rejected is final. The author can submit a new report.</p>

    <div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <button v-if="c.status !== 'rejected'" type="button" class="link inline-flex items-center gap-1" @click="asking = !asking"><MessageSquareWarning class="size-4" aria-hidden="true" /> Ask the author for a correction</button>
      <button v-if="['published', 'community_corroborated', 'officially_sourced', 'outdated'].includes(c.status)" type="button" class="link inline-flex items-center gap-1" :disabled="busy" @click="run(() => confirmStillAccurate(c.id), 'Marked as still accurate today.')"><CheckCheck class="size-4" aria-hidden="true" /> Still accurate today</button>
      <button type="button" class="link inline-flex items-center gap-1" :aria-expanded="!!history" @click="toggleHistory"><History class="size-4" aria-hidden="true" /> {{ history ? 'Hide history' : 'History' }}</button>
    </div>
    <form v-if="asking" class="mt-3 grid gap-2" @submit.prevent="sendRequest">
      <label :for="`ask-${c.id}`" class="text-sm font-semibold">What should the author correct? (shown to the author)</label>
      <textarea :id="`ask-${c.id}`" v-model="ask" class="input" rows="2" maxlength="2000" />
      <button type="submit" class="btn btn-quiet justify-self-start" :disabled="ask.trim().length < 10 || busy">Send request</button>
    </form>
    <ol v-if="history" class="mt-3 grid gap-1 border-t border-line pt-3 text-sm">
      <li v-if="!history.length" class="text-muted">No recorded actions.</li>
      <li v-for="(h, i) in history" :key="i"><span class="text-muted">{{ formatDayTime(h.at) }}</span> · {{ h.action.replace('contribution.', '').replaceAll('_', ' ') }} · {{ h.actor }}{{ h.actor_type === 'user' ? ' (rider)' : '' }}<template v-if="h.note">: {{ h.note }}</template></li>
    </ol>
    <p v-if="notice" class="mt-2 text-sm" role="status">{{ notice }}</p>
    <p v-if="error" class="mt-2 text-sm text-danger" role="alert">{{ error }}</p>
  </li>
</template>
