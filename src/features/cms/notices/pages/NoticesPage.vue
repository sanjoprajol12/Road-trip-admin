<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import { deleteNotice, listNotices, saveNotice, type NoticeBody, type NoticeRow } from '../services/notices'

// Site-wide notices: a short bar above the website header. About the website, never a live road or safety status.
const notices = ref<NoticeRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const done = ref<string | null>(null)
async function load() {
  loading.value = true
  try {
    notices.value = await listNotices()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const empty = (): NoticeBody => ({ body: '', level: 'info', link_label: null, link_target: null, status: 'draft', publish_at: null, expires_at: null })
const editing = ref<{ id: string | null } | null>(null)
const form = reactive<NoticeBody>(empty())
const errors = ref<Record<string, string>>({})
function open(n: NoticeRow | null) {
  Object.assign(form, n ? { ...n, publish_at: n.publish_at?.slice(0, 16) ?? null, expires_at: n.expires_at?.slice(0, 16) ?? null } : empty())
  errors.value = {}
  editing.value = { id: n?.id ?? null }
}
async function save() {
  errors.value = {}
  const iso = (v: string | null) => (v ? new Date(v).toISOString() : null)
  try {
    await saveNotice(editing.value!.id, { ...form, link_label: form.link_label || null, link_target: form.link_target || null, publish_at: iso(form.publish_at), expires_at: iso(form.expires_at) })
    done.value = 'Notice saved.'
    editing.value = null
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { _: errorMessage(e) }
  }
}
async function remove(n: NoticeRow) {
  try {
    await deleteNotice(n.id)
    done.value = 'Notice deleted.'
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
const statusLabel = { draft: 'Draft', published: 'Published', archived: 'Archived' }
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Notices</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Short announcements shown above the website header while published and inside their dates. Never use them for live road or safety status.</p>
    <button type="button" class="btn btn-primary mt-6" @click="open(null)"><Plus class="size-4" aria-hidden="true" /> New notice</button>
    <p v-if="done" class="mt-4 text-sm text-success" role="status">{{ done }}</p>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Notices could not be loaded.</StatusLine>
    <StatusLine v-else-if="!notices.length" state="empty">No notices yet.</StatusLine>
    <ul v-else class="mt-6 grid max-w-3xl border-t border-line" aria-label="Notices">
      <li v-for="n in notices" :key="n.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 text-sm">
        <span class="grid gap-0.5">
          <span class="font-semibold">{{ n.body }}</span>
          <span class="text-xs text-muted">{{ statusLabel[n.status] }} · {{ n.level === 'warning' ? 'Warning' : 'Information' }}<template v-if="n.publish_at"> · from {{ formatDayTime(n.publish_at) }}</template><template v-if="n.expires_at"> · until {{ formatDayTime(n.expires_at) }}</template></span>
        </span>
        <span class="flex gap-2">
          <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Edit notice: ${n.body}`" @click="open(n)">Edit</button>
          <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Delete notice: ${n.body}`" @click="remove(n)">Delete</button>
        </span>
      </li>
    </ul>

    <ConfirmDialog :open="!!editing" :title="editing?.id ? 'Edit notice' : 'New notice'" confirm-label="Save notice" @confirm="save" @cancel="editing = null">
      <div class="grid gap-3 text-ink">
        <p v-if="errors._" class="text-sm text-danger" role="alert">{{ errors._ }}</p>
        <div class="field"><label for="nb">Text</label><textarea id="nb" v-model="form.body" class="input" rows="2" maxlength="300" :aria-invalid="!!errors.body" /><p v-if="errors.body" class="field-error">{{ errors.body }}</p></div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field"><label for="nl">Kind</label><select id="nl" v-model="form.level" class="input"><option value="info">Information</option><option value="warning">Warning</option></select></div>
          <div class="field"><label for="ns">Status</label><select id="ns" v-model="form.status" class="input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field"><label for="nll">Link text (optional)</label><input id="nll" v-model="form.link_label" class="input" maxlength="30" /><p v-if="errors.link_label" class="field-error">{{ errors.link_label }}</p></div>
          <div class="field"><label for="nlt">Link goes to</label><input id="nlt" v-model="form.link_target" class="input" maxlength="300" placeholder="/preparation" /><p v-if="errors.link_target" class="field-error">{{ errors.link_target }}</p></div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="field"><label for="npa">Show from (optional)</label><input id="npa" v-model="form.publish_at" type="datetime-local" class="input" /></div>
          <div class="field"><label for="nea">Show until (optional)</label><input id="nea" v-model="form.expires_at" type="datetime-local" class="input" /><p v-if="errors.expires_at" class="field-error">{{ errors.expires_at }}</p></div>
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>
