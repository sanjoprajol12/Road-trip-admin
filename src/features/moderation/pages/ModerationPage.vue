<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Flag } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import type { Contribution } from '@/types/api'
import { decideContribution, listForModeration } from '../services/moderation'

const statuses: Record<string, string> = {
  pending_review: 'Waiting for review', flagged: 'Flagged', published: 'Published', community_corroborated: 'Corroborated', officially_sourced: 'Officially sourced', outdated: 'Outdated', rejected: 'Rejected', all: 'All',
}
const decisions = ['published', 'community_corroborated', 'officially_sourced', 'outdated', 'rejected', 'flagged'] as const
const route = useRoute()
const router = useRouter()
const status = ref(String(route.query.status ?? 'pending_review'))
const items = ref<Contribution[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = await listForModeration(status.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(status, () => (void router.replace({ query: { status: status.value } }), void load()), { immediate: true })

const forms = reactive<Record<string, { status: string; note: string; source: string; error: string | null; busy: boolean }>>({})
const formOf = (c: Contribution) => (forms[c.id] ??= { status: '', note: '', source: '', error: null, busy: false })
async function decide(c: Contribution) {
  const f = formOf(c)
  f.busy = true
  f.error = null
  try {
    await decideContribution(c.id, { status: f.status, moderation_note: f.note || null, source_url: f.source || null })
    delete forms[c.id]
    await load()
  } catch (e) {
    f.error = errorMessage(e)
  } finally {
    f.busy = false
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Moderation</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Decide whether rider contributions are published. You set a status and a note; you never edit what the rider wrote. Publication means "passed review", not "proven true".</p>
    <div class="mt-6 field"><label for="ms">Show</label><select id="ms" v-model="status" class="input w-56"><option v-for="(l, s) in statuses" :key="s" :value="s">{{ l }}</option></select></div>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">The queue could not be loaded.</StatusLine>
    <StatusLine v-else-if="!items.length" state="empty">Nothing here.</StatusLine>
    <ul v-else class="mt-6 grid gap-6">
      <li v-for="c in items" :key="c.id" class="rounded-md border border-line bg-surface p-5">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="label text-muted">{{ c.kind.replace('_', ' ') }} · {{ statuses[c.status] ?? c.status }}</p>
          <p v-if="c.open_reports" class="flex items-center gap-1 text-sm font-semibold text-danger"><Flag class="size-4" aria-hidden="true" /> {{ c.open_reports }} open reports</p>
        </div>
        <h2 class="mt-1 text-xl font-bold">{{ c.title }}</h2>
        <p class="mt-1 text-sm text-muted">
          By {{ c.author?.display_name }} · observed {{ formatDay(c.observed_on) }} · sent {{ formatDay(c.submitted_at) }}
          <template v-if="c.segment"> · {{ c.route?.name }}: {{ c.segment.start_name }} to {{ c.segment.end_name }}</template>
          <template v-else-if="c.destination"> · {{ c.destination.name }}</template>
        </p>
        <p class="mt-3 max-w-prose whitespace-pre-line">{{ c.body }}</p>
        <dl v-if="Object.keys(c.details).length" class="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          <div v-for="(v, k) in c.details" :key="k"><dt class="inline font-semibold">{{ String(k).replace('_', ' ') }}: </dt><dd class="inline">{{ v }}</dd></div>
        </dl>
        <div v-if="c.media?.length" class="mt-3 flex flex-wrap gap-2"><img v-for="m in c.media" :key="m.id" :src="m.url" :alt="m.alt" class="h-28 rounded-md object-cover" /></div>
        <ul v-if="c.reports?.length" class="mt-3 grid gap-1 text-sm"><li v-for="(r, i) in c.reports" :key="i">Report: “{{ r.reason }}”</li></ul>
        <p v-if="c.moderation_note" class="mt-3 text-sm"><span class="font-semibold">Current note:</span> {{ c.moderation_note }}</p>
        <form class="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end" @submit.prevent="decide(c)">
          <div class="field"><label :for="`st-${c.id}`">Decision</label><select :id="`st-${c.id}`" v-model="formOf(c).status" class="input"><option value="" disabled>Choose</option><option v-for="d in decisions" :key="d" :value="d">{{ statuses[d] }}</option></select></div>
          <div class="field"><label :for="`nt-${c.id}`">Note {{ ['rejected', 'flagged'].includes(formOf(c).status) ? '(required, shown to the author)' : '(optional)' }}</label><input :id="`nt-${c.id}`" v-model="formOf(c).note" class="input" maxlength="2000" /></div>
          <button type="submit" class="btn btn-primary" :disabled="!formOf(c).status || formOf(c).busy">Apply</button>
          <div v-if="formOf(c).status === 'officially_sourced'" class="field sm:col-span-3"><label :for="`src-${c.id}`">Official source link</label><input :id="`src-${c.id}`" v-model="formOf(c).source" type="url" class="input" /></div>
          <p v-if="formOf(c).error" class="text-sm text-danger sm:col-span-3" role="alert">{{ formOf(c).error }}</p>
        </form>
      </li>
    </ul>
  </div>
</template>
