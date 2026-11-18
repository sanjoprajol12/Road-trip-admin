<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import StatusLine from '@/components/ui/StatusLine.vue'
import { api, errorMessage } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import type { AuditEntry, Page } from '@/types/api'

const subjects: Record<string, string> = {
  user_roles: 'Staff roles', user_verifications: 'Verification', users: 'Accounts', contributions: 'Contributions', destinations: 'Destinations', routes: 'Routes', events: 'Events', guides: 'Guides', service_points: 'Service points',
}
const subject = ref('')
const page = ref(1)
const result = ref<Page<AuditEntry> | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    result.value = (await api.get<Page<AuditEntry>>('/admin/audit-logs', { params: { subject: subject.value || undefined, page: page.value } })).data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(subject, () => (page.value = 1))
watch([subject, page], load, { immediate: true })
const pages = computed(() => result.value?.last_page ?? 1)
const ignored = new Set(['updated_at', 'created_at'])
const changes = (e: AuditEntry) => {
  const before = e.old_data ?? {}
  const after = e.new_data ?? {}
  return Object.keys({ ...before, ...after }).filter((k) => !ignored.has(k) && JSON.stringify(before[k]) !== JSON.stringify(after[k])).map((k) => [k, before[k], after[k]] as const)
}
const show = (v: unknown) => (v === null || v === undefined || v === '' ? '(empty)' : typeof v === 'string' ? v : JSON.stringify(v))
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Audit log</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Every staff decision and sensitive change, written by the API in the same transaction as the change. Entries cannot be edited or deleted.</p>
    <div class="mt-6 field">
      <label for="f-subj">Show</label>
      <select id="f-subj" v-model="subject" class="input w-52"><option value="">Everything</option><option v-for="(l, k) in subjects" :key="k" :value="k">{{ l }}</option></select>
    </div>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">The audit log could not be loaded.</StatusLine>
    <StatusLine v-else-if="!result?.data.length" state="empty">No entries yet.</StatusLine>
    <template v-else>
      <ol class="mt-6 border-t border-line" aria-label="Audit entries, newest first">
        <li v-for="e in result.data" :key="e.id" class="grid gap-1 border-b border-line py-3 text-sm md:grid-cols-[12rem_1fr]">
          <p class="tabular text-muted">{{ formatDayTime(e.created_at) }}</p>
          <div class="min-w-0">
            <p><span class="font-semibold">{{ e.action }}</span> <span class="text-muted">· {{ subjects[e.subject_type] ?? e.subject_type }}<template v-if="e.subject_user"> of {{ e.subject_user }}</template> · by {{ e.actor ?? 'System or console' }}</span></p>
            <ul class="mt-1 grid gap-0.5 text-xs text-muted">
              <li v-for="[field, before, after] in changes(e)" :key="field" class="break-words"><span class="font-semibold text-ink">{{ field }}</span>: {{ show(before) }} → {{ show(after) }}</li>
            </ul>
          </div>
        </li>
      </ol>
      <nav class="mt-4 flex items-center gap-3 text-sm" aria-label="Audit pages">
        <button type="button" class="btn btn-quiet min-h-9" :disabled="page <= 1" @click="page--">Newer</button>
        <span class="tabular text-muted">Page {{ page }} of {{ pages }} · {{ result.total }} entries</span>
        <button type="button" class="btn btn-quiet min-h-9" :disabled="page >= pages" @click="page++">Older</button>
      </nav>
    </template>
  </div>
</template>
