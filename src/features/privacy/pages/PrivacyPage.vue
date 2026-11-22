<script setup lang="ts">
import { ref } from 'vue'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { errorMessage } from '@/lib/api/client'
import { formatDay, formatDayTime } from '@/lib/format'
import { useStaff } from '@/features/authentication/staffAccess'
import { listDeletions, listEvidence, releaseEvidence, showEvidence, type DeletionRow, type EvidenceDetail, type EvidenceRow } from '../services/privacy'

const { can } = useStaff()
const statusLabel: Record<DeletionRow['status'], string> = { scheduled: 'Scheduled', cancelled: 'Cancelled by the rider', done: 'Deleted' }
const reasonLabel: Record<string, string> = { open_case_on_author_deletion: 'Open case on the author’s contribution', open_report_by_deleted_rider: 'Open report filed by the deleted rider' }

const deletions = ref<{ data: DeletionRow[]; file_retries: number } | null>(null)
const evidence = ref<EvidenceRow[] | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    ;[deletions.value, evidence.value] = await Promise.all([can('users.deletions.view') ? listDeletions() : null, can('moderation.evidence.view') ? listEvidence() : null])
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
void load()

const open = ref<EvidenceDetail | null>(null)
const openError = ref<string | null>(null)
const viewing = ref<string | null>(null)
async function view(id: string) {
  openError.value = null
  viewing.value = id
  try {
    open.value = await showEvidence(id)
  } catch (e) {
    openError.value = errorMessage(e)
  } finally {
    viewing.value = null
  }
}
const releasing = ref<EvidenceRow | null>(null)
const busy = ref(false)
async function release() {
  if (!releasing.value) return
  busy.value = true
  try {
    await releaseEvidence(releasing.value.id)
    if (open.value?.id === releasing.value.id) open.value = null
    releasing.value = null
    await load()
  } catch (e) {
    openError.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}
const countText = (c: Record<string, number>) =>
  Object.entries(c)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k.replace(/_/g, ' ')} ${n}`)
    .join(' · ') || 'nothing to count'
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Deletions and evidence</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">
      Riders delete their own accounts after a 30-day cooling-off. Staff see only dates and counts. Content under an open moderation case is kept here for at most 30 days
      after the deletion, then removed; every view is recorded in the audit log.
    </p>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">This page could not be loaded.</StatusLine>
    <template v-else>
      <section v-if="evidence" class="mt-8" aria-labelledby="evidence-title">
        <h2 id="evidence-title" class="text-xl font-bold">Moderation evidence</h2>
        <StatusLine v-if="!evidence.length" state="empty">No evidence is held.</StatusLine>
        <ul v-else class="mt-3 border-t border-line">
          <li v-for="e in evidence" :key="e.id" :data-evidence-id="e.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-sm">
            <span>
              <span class="block font-semibold">{{ reasonLabel[e.reason] ?? e.reason }}</span>
              <span class="block text-muted">
                Kept since {{ formatDay(e.created_at) }} ·
                <template v-if="e.disposed_at">{{ e.disposition === 'released' ? 'removed early' : 'removed after 30 days' }} on {{ formatDay(e.disposed_at) }}</template>
                <template v-else>removed on {{ formatDay(e.held_until) }} at the latest</template>
              </span>
            </span>
            <span v-if="!e.disposed_at" class="flex gap-2">
              <button type="button" class="btn btn-quiet min-h-9" :disabled="viewing === e.id" :aria-busy="viewing === e.id" @click="view(e.id)">{{ viewing === e.id ? 'Opening…' : 'View (recorded)' }}</button>
              <button type="button" class="btn btn-quiet min-h-9" @click="releasing = e">Remove now</button>
            </span>
          </li>
        </ul>
        <p v-if="openError" role="alert" class="mt-3 text-sm text-danger">{{ openError }}</p>
        <article v-if="open" class="mt-4 rounded-md border border-line bg-surface p-5 text-sm" aria-label="Evidence details">
          <p class="text-muted">Author: {{ open.snapshot.author?.display_name ?? 'not part of this record' }}</p>
          <template v-if="open.snapshot.contribution">
            <h3 class="mt-2 font-semibold text-balance wrap-anywhere">{{ open.snapshot.contribution.title }}</h3>
            <p class="mt-1 whitespace-pre-line">{{ open.snapshot.contribution.body }}</p>
          </template>
          <h4 class="mt-4 font-semibold">Reports</h4>
          <ul class="mt-1 grid gap-1">
            <li v-for="(r, i) in open.snapshot.reports ?? (open.snapshot.report ? [open.snapshot.report] : [])" :key="i">{{ r.category }}: {{ r.reason }} <span class="text-muted">({{ formatDayTime(r.filed_at) }})</span></li>
          </ul>
          <div v-if="open.files.length" class="mt-4 flex flex-wrap gap-3">
            <img v-for="(src, i) in open.files" :key="src" :src="`/api/v1${src.replace(/^\/api\/v1/, '')}`" :alt="`Evidence photo ${i + 1}`" class="h-32 w-auto rounded-sm border border-line" />
          </div>
          <button type="button" class="btn btn-quiet mt-4 min-h-9" @click="open = null">Close</button>
        </article>
      </section>

      <section v-if="deletions" class="mt-10" aria-labelledby="deletions-title">
        <h2 id="deletions-title" class="text-xl font-bold">Account deletion requests</h2>
        <p v-if="deletions.file_retries" class="mt-2 text-sm text-warning" role="status"><span class="tabular-nums">{{ deletions.file_retries }}</span> file removals failed and are retried on the next daily run.</p>
        <StatusLine v-if="!deletions.data.length" state="empty">No requests yet.</StatusLine>
        <ul v-else class="mt-3 border-t border-line">
          <li v-for="d in deletions.data" :key="d.id" class="grid gap-1 border-b border-line py-3 text-sm md:grid-cols-[12rem_1fr]">
            <p class="font-semibold">{{ statusLabel[d.status] }}</p>
            <div>
              <p>Asked {{ formatDay(d.requested_at) }} · <template v-if="d.completed_at">deleted {{ formatDay(d.completed_at) }}</template><template v-else-if="d.cancelled_at">cancelled {{ formatDay(d.cancelled_at) }}</template><template v-else>runs from {{ formatDay(d.run_after) }}</template></p>
              <p v-if="d.status === 'done'" class="tabular-nums text-muted">{{ countText(d.counts) }}</p>
              <p v-if="d.last_error" class="text-danger">Last run failed ({{ d.last_error }}, {{ d.attempts }} attempts); nothing was deleted and it is retried daily.</p>
            </div>
          </li>
        </ul>
      </section>
    </template>

    <ConfirmDialog :open="!!releasing" title="Remove this evidence now?" confirm-label="Remove" danger :busy="busy" @confirm="release" @cancel="releasing = null">
      Use this once moderators no longer need it. The copy and its photos are removed and only the outcome stays. It cannot be undone.
    </ConfirmDialog>
  </div>
</template>
