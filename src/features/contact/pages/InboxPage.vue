<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Mail, MailOpen, Search } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { errorMessage } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import { useStaff } from '@/features/authentication/staffAccess'
import { deleteMessage, listMessages, updateMessage, type ContactMessage } from '../services/contact'

// Contact form inbox. Messages hold personal data: only staff with contact.view see them; contact.manage changes status.
const { can } = useStaff()
const filters = reactive({ status: '', q: '', page: 1 })
const items = ref<ContactMessage[]>([])
const meta = ref({ total: 0, current_page: 1, last_page: 1, unread: 0 })
const loading = ref(true)
const error = ref<string | null>(null)
const open = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    const r = await listMessages({ status: filters.status || undefined, q: filters.q || undefined, page: filters.page })
    items.value = r.data
    meta.value = r.meta
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(() => [filters.status, filters.page], () => void load(), { immediate: true })
async function act(fn: () => Promise<unknown>) {
  try {
    await fn()
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  }
}
async function toggle(m: ContactMessage) {
  open.value = open.value === m.id ? null : m.id
  if (open.value && !m.read_at) await act(() => updateMessage(m.id, { read: true }))
}
const removing = ref<ContactMessage | null>(null)
const statusLabel = { new: 'New', open: 'In progress', done: 'Done', spam: 'Spam' }
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Contact messages</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Messages sent through the website contact form. They contain personal data: reply from your own mail program and do not copy them elsewhere. {{ meta.unread }} unread.</p>
    <div class="mt-6 flex flex-wrap items-end gap-3">
      <form class="flex items-end gap-2" role="search" @submit.prevent="(filters.page = 1), load()">
        <div class="field"><label for="i-q">Search messages</label><input id="i-q" v-model="filters.q" type="search" class="input w-64" /></div>
        <button type="submit" class="btn btn-quiet" aria-label="Search"><Search class="size-4" aria-hidden="true" /></button>
      </form>
      <div class="field"><label for="i-s">Status</label><select id="i-s" v-model="filters.status" class="input w-44"><option value="">All except spam</option><option v-for="(l, v) in statusLabel" :key="v" :value="v">{{ l }}</option></select></div>
    </div>
    <StatusLine v-if="loading && !items.length" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Messages could not be loaded.</StatusLine>
    <StatusLine v-else-if="!items.length" state="empty">No messages.</StatusLine>
    <ul v-else class="mt-6 grid max-w-4xl border-t border-line" aria-label="Contact messages">
      <li v-for="m in items" :key="m.id" class="border-b border-line py-3 text-sm">
        <button type="button" class="flex w-full flex-wrap items-baseline gap-x-3 text-left" :aria-expanded="open === m.id" @click="toggle(m)">
          <component :is="m.read_at ? MailOpen : Mail" class="size-4 shrink-0 self-center" :class="m.read_at ? 'text-muted' : 'text-crimson'" aria-hidden="true" />
          <span :class="m.read_at ? '' : 'font-bold'">{{ m.subject }}</span>
          <span class="text-muted">{{ m.name }} · {{ formatDayTime(m.created_at) }} · {{ statusLabel[m.status] }}</span>
          <span class="sr-only">{{ m.read_at ? 'Read' : 'Unread' }}</span>
        </button>
        <div v-if="open === m.id" class="mt-3 grid gap-3 pl-7">
          <p><a :href="`mailto:${m.email}`" class="link">{{ m.email }}</a></p>
          <p class="max-w-prose whitespace-pre-line">{{ m.body }}</p>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="btn btn-quiet min-h-9 px-3" @click="act(() => updateMessage(m.id, { read: false }))">Mark unread</button>
            <template v-if="can('contact.manage')">
              <button v-for="(l, v) in statusLabel" v-show="v !== m.status" :key="v" type="button" class="btn btn-quiet min-h-9 px-3" @click="act(() => updateMessage(m.id, { status: v }))">Mark {{ l.toLowerCase() }}</button>
              <button type="button" class="btn btn-quiet min-h-9 px-3" @click="removing = m">Delete</button>
            </template>
          </div>
        </div>
      </li>
    </ul>
    <nav v-if="meta.last_page > 1" class="mt-4 flex items-center gap-3 text-sm" aria-label="Pages">
      <button type="button" class="btn btn-quiet min-h-9 px-3" :disabled="filters.page <= 1" @click="filters.page--">Previous</button>
      <span>Page {{ meta.current_page }} of {{ meta.last_page }}</span>
      <button type="button" class="btn btn-quiet min-h-9 px-3" :disabled="filters.page >= meta.last_page" @click="filters.page++">Next</button>
    </nav>
    <ConfirmDialog :open="!!removing" :title="`Delete the message from ${removing?.name ?? ''}?`" confirm-label="Delete" danger @confirm="(act(() => deleteMessage(removing!.id)), (removing = null))" @cancel="removing = null">This removes the message and its personal data. It cannot be undone.</ConfirmDialog>
  </div>
</template>
