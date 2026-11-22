<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import { decideCorrection, listCorrections, type PlaceCorrectionRow } from '../services/places'

// Riders' suggested corrections to published places. Accepting records the decision; edit the place to apply it.
const status = ref('pending')
const items = ref<PlaceCorrectionRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const notes = reactive<Record<string, string>>({})
const msg = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = await listCorrections(status.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(status, load, { immediate: true })
async function decide(c: PlaceCorrectionRow, d: 'accepted' | 'rejected') {
  try {
    await decideCorrection(c.id, d, notes[c.id] ?? '')
    msg.value = d === 'accepted' ? `Accepted. Now edit ${c.place.name} to apply it.` : 'Correction rejected.'
    await load()
  } catch (e) {
    msg.value = errorMessage(e)
  }
}
</script>

<template>
  <section class="mt-6" aria-label="Corrections">
    <div class="field"><label for="cq-s">Show</label><select id="cq-s" v-model="status" class="input w-48"><option value="pending">Waiting for review</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></div>
    <p v-if="msg" class="mt-3 text-sm" role="status">{{ msg }}</p>
    <StatusLine v-if="loading && !items.length" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Corrections could not be loaded.</StatusLine>
    <StatusLine v-else-if="!items.length" state="empty">Nothing here.</StatusLine>
    <ul v-else class="mt-4 grid gap-4" aria-label="Corrections list">
      <li v-for="c in items" :key="c.id" class="rounded-md border border-line bg-surface p-4 text-sm">
        <p class="font-semibold">{{ c.place.name }} <span class="font-normal text-muted">· {{ c.rider }} · {{ formatDayTime(c.created_at) }}</span></p>
        <p class="mt-2 whitespace-pre-line">{{ c.body }}</p>
        <p v-if="c.position" class="mt-1 text-muted">Proposed position: {{ c.position[0] }}, {{ c.position[1] }} (now {{ c.place.position[0] }}, {{ c.place.position[1] }})</p>
        <p v-if="c.review_note" class="mt-1"><span class="font-semibold">Review note:</span> {{ c.review_note }}</p>
        <div v-if="c.status === 'pending'" class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div class="field"><label :for="`cq-n-${c.id}`">Note (required)</label><input :id="`cq-n-${c.id}`" v-model="notes[c.id]" class="input" maxlength="1000" /></div>
          <button type="button" class="btn btn-primary" :disabled="(notes[c.id] ?? '').trim().length < 5" @click="decide(c, 'accepted')">Accept</button>
          <button type="button" class="btn btn-quiet" :disabled="(notes[c.id] ?? '').trim().length < 5" @click="decide(c, 'rejected')">Reject</button>
        </div>
      </li>
    </ul>
  </section>
</template>
