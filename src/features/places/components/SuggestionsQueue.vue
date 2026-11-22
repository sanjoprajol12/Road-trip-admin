<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, Eye, MessageSquareWarning, X } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDay, formatDayTime } from '@/lib/format'
import { previewLink } from '@/features/cms/home/services/home'
import { decideSuggestion, getSuggestion, listSuggestions, placeCategories, placeStatuses, type PlaceEvent, type PlaceRow } from '../services/places'

// Review queue for rider-suggested places (places.review). Read-only details, history and three decisions; the
// rider's text is never edited here. The API enforces every rule, including no review of your own suggestion.
const status = ref('pending_review')
const items = ref<PlaceRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const open = ref<{ place: PlaceRow; history: PlaceEvent[] } | null>(null)
const note = ref('')
const msg = ref<string | null>(null)
const busy = ref(false)
async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = (await listSuggestions(status.value)).data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(status, () => ((open.value = null), void load()), { immediate: true })
async function show(p: PlaceRow) {
  msg.value = null
  note.value = ''
  try {
    open.value = { place: p, ...(await getSuggestion(p.id)) }
  } catch (e) {
    msg.value = errorMessage(e)
  }
}
async function decide(d: 'approve' | 'request_changes' | 'reject') {
  if (!open.value) return
  busy.value = true
  msg.value = null
  try {
    const p = await decideSuggestion(open.value.place.id, d, note.value || null)
    msg.value = `${p.name}: ${placeStatuses[p.status]}.`
    open.value = null
    await load()
  } catch (e) {
    const f = fieldErrors(e)
    msg.value = f.note ?? f.decision ?? errorMessage(e)
  } finally {
    busy.value = false
  }
}
async function preview() {
  if (!open.value) return
  const url = new URL(await previewLink())
  url.pathname = `/places/${open.value.place.slug}`
  window.open(url.toString(), '_blank', 'noopener')
}
</script>

<template>
  <section class="mt-6" aria-label="Rider suggestions">
    <div class="field"><label for="sq-s">Show</label><select id="sq-s" v-model="status" class="input w-56"><option value="pending_review">Waiting for review</option><option value="changes_requested">Changes requested</option><option value="published">Approved</option><option value="rejected">Rejected</option></select></div>
    <p v-if="msg" class="mt-3 text-sm" role="status">{{ msg }}</p>

    <article v-if="open" class="mt-4 grid gap-3 rounded-md border border-line bg-surface p-5 text-sm" :aria-label="`Review ${open.place.name}`">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 class="text-lg font-bold">{{ open.place.name }}</h2>
        <span><span class="font-semibold">{{ placeStatuses[open.place.status] }}</span> · {{ placeCategories[open.place.category] }}</span>
      </div>
      <p class="text-muted">Suggested by {{ open.place.submitted_by_name ?? 'a rider' }}<template v-if="open.place.observed_on"> · seen {{ formatDay(open.place.observed_on) }}</template></p>
      <p v-if="open.place.summary">{{ open.place.summary }}</p>
      <p class="max-w-prose whitespace-pre-line">{{ open.place.description }}</p>
      <p>Position: {{ open.place.position[0] }}, {{ open.place.position[1] }}<template v-if="open.place.destination"> · part of {{ open.place.destination.name }}</template></p>
      <p v-if="open.place.moderation_note" class="text-muted">Earlier note to the rider: {{ open.place.moderation_note }}</p>
      <button type="button" class="link inline-flex items-center gap-1 justify-self-start" @click="preview"><Eye class="size-4" aria-hidden="true" /> Preview on the website</button>
      <div v-if="['pending_review', 'changes_requested'].includes(open.place.status)" class="grid gap-2 border-t border-line pt-3">
        <div class="field"><label for="sq-note">Reason (required to reject or ask for changes; the rider sees it)</label><textarea id="sq-note" v-model="note" class="input" rows="2" maxlength="2000" /></div>
        <div class="flex flex-wrap gap-2">
          <button v-if="open.place.status === 'pending_review'" type="button" class="btn btn-primary" :disabled="busy" @click="decide('approve')"><Check class="size-4" aria-hidden="true" /> Approve and publish</button>
          <button v-if="open.place.status === 'pending_review'" type="button" class="btn btn-quiet" :disabled="busy" @click="decide('request_changes')"><MessageSquareWarning class="size-4" aria-hidden="true" /> Ask for changes</button>
          <button type="button" class="btn btn-quiet" :disabled="busy" @click="decide('reject')"><X class="size-4" aria-hidden="true" /> Reject</button>
        </div>
      </div>
      <div>
        <h3 class="font-semibold">History</h3>
        <ol class="mt-1 grid gap-1" aria-label="History">
          <li v-if="!open.history.length" class="text-muted">No recorded actions.</li>
          <li v-for="(h, i) in open.history" :key="i"><span class="text-muted">{{ formatDayTime(h.at) }}</span> · {{ h.action.replace('place.', '').replaceAll('_', ' ') }} · {{ h.actor }}{{ h.actor_type === 'user' ? ' (rider)' : '' }}<template v-if="h.note">: {{ h.note }}</template></li>
        </ol>
      </div>
      <button type="button" class="btn btn-quiet justify-self-start" @click="open = null">Close</button>
    </article>

    <StatusLine v-if="loading && !items.length" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Suggestions could not be loaded.</StatusLine>
    <StatusLine v-else-if="!items.length" state="empty">No suggestions here.</StatusLine>
    <ul v-else class="mt-4 grid border-t border-line text-sm" aria-label="Suggestions list">
      <li v-for="p in items" :key="p.id" class="flex flex-wrap items-center justify-between gap-2 border-b border-line py-3">
        <span><span class="font-semibold">{{ p.name }}</span> <span class="text-muted">· {{ placeCategories[p.category] }} · by {{ p.submitted_by_name ?? 'a rider' }} · {{ formatDayTime(p.updated_at) }}</span></span>
        <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Review ${p.name}`" @click="show(p)">Review</button>
      </li>
    </ul>
  </section>
</template>
