<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Eye, Plus, Search } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import { previewLink } from '@/features/cms/home/services/home'
import EntryFields from '../components/EntryFields.vue'
import { deleteEntry, getTypes, listEntries, saveEntry, type CmsEntry, type CmsEntryBody, type CmsType } from '../services/content'

// Pages, FAQs, blog (posts, categories, tags, authors), team, popups and banners: one screen, one tab per type
// this staff member may manage. Publishing needs cms.content.publish (the server decides; the form only hints).
const route = useRoute()
const types = ref<CmsType[]>([])
const canPublish = ref(false)
const current = computed(() => types.value.find((t) => t.type === route.params.type) ?? types.value[0] ?? null)
const items = ref<CmsEntry[]>([])
const meta = ref({ total: 0, current_page: 1, last_page: 1 })
const filters = reactive({ q: '', status: '', page: 1 })
const loading = ref(true)
const error = ref<string | null>(null)
const done = ref<string | null>(null)

async function load() {
  if (!current.value) return
  loading.value = true
  error.value = null
  try {
    const r = await listEntries(current.value.type, { q: filters.q || undefined, status: filters.status || undefined, page: filters.page })
    items.value = r.data
    meta.value = r.meta
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
getTypes().then((r) => ((types.value = r.data), (canPublish.value = r.can_publish), load())).catch((e) => ((error.value = errorMessage(e)), (loading.value = false)))
watch(() => route.params.type, () => ((editing.value = null), (filters.page = 1), void load()))
watch(() => [filters.status, filters.page], () => void load())

const blank = (): CmsEntryBody => ({ slug: null, title: '', summary: null, body: null, data: {}, media_asset_id: null, status: 'draft', publish_at: null, expires_at: null, position: 0, seo_title: null, seo_description: null })
const editing = ref<{ id: string | null } | null>(null)
const form = reactive<CmsEntryBody>(blank())
const errors = ref<Record<string, string>>({})
const local = (v: string | null) => (v ? v.slice(0, 16) : null)
function open(e: CmsEntry | null) {
  Object.assign(form, blank(), e ? { ...structuredClone(toRaw(e)), publish_at: local(e.publish_at), expires_at: local(e.expires_at) } : {})
  errors.value = {}
  done.value = null
  editing.value = { id: e?.id ?? null }
}
const has = (k: CmsType['core'][number]) => current.value?.core.includes(k) ?? false
const saving = ref(false)
async function save() {
  if (!current.value || saving.value) return // a second click while the first request runs would create a second entry
  saving.value = true
  errors.value = {}
  const iso = (v: string | null) => (v ? new Date(v).toISOString() : null)
  const blankToNull = (v: string | null) => (v === '' ? null : v)
  try {
    const saved = await saveEntry(current.value.type, editing.value!.id, { ...form, slug: has('slug') ? form.slug : null, summary: blankToNull(form.summary), body: blankToNull(form.body),
      seo_title: blankToNull(form.seo_title), seo_description: blankToNull(form.seo_description), publish_at: iso(form.publish_at), expires_at: iso(form.expires_at) })
    done.value = `${current.value.singular} saved.`
    editing.value = { id: saved.id }
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { _: errorMessage(e) }
  } finally {
    saving.value = false
  }
}
const removing = ref<CmsEntry | null>(null)
async function remove() {
  const e = removing.value
  removing.value = null
  if (!e || !current.value) return
  try {
    await deleteEntry(current.value.type, e.id)
    done.value = `${e.title} deleted.`
    await load()
  } catch (err) {
    error.value = errorMessage(err)
  }
}
// Pages and posts open on the public website with a 30-minute signed preview token (drafts visible).
const publicPath = (e: { slug: string | null }) => (current.value?.type === 'page' ? `/pages/${e.slug}` : current.value?.type === 'post' ? `/blog/${e.slug}` : null)
async function preview() {
  const path = publicPath(form)
  if (!path) return
  const url = new URL(await previewLink())
  url.pathname = path
  window.open(url.toString(), '_blank', 'noopener')
}
const statusLabel = { draft: 'Draft', published: 'Published', archived: 'Archived' }
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Content</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Pages, questions, blog, team, popups and banners for the public website. Text is shown as plain text. Published items appear only inside their dates.</p>
    <nav v-if="types.length" class="mt-6 flex flex-wrap gap-2" aria-label="Content types">
      <RouterLink v-for="t in types" :key="t.type" :to="{ name: 'cms-content', params: { type: t.type } }" class="btn min-h-9 px-3 text-sm" :class="current?.type === t.type ? 'btn-primary' : 'btn-quiet'" :aria-current="current?.type === t.type ? 'page' : undefined">{{ t.label }}</RouterLink>
    </nav>
    <p v-if="done" class="mt-4 text-sm text-success" role="status">{{ done }}</p>

    <template v-if="current">
      <div class="mt-6 flex flex-wrap items-end gap-3">
        <form class="flex items-end gap-2" role="search" @submit.prevent="(filters.page = 1), load()">
          <div class="field"><label for="c-q">Search {{ current.label.toLowerCase() }}</label><input id="c-q" v-model="filters.q" type="search" class="input w-64" /></div>
          <button type="submit" class="btn btn-quiet" aria-label="Search"><Search class="size-4" aria-hidden="true" /></button>
        </form>
        <div class="field"><label for="c-s">Filter by status</label><select id="c-s" v-model="filters.status" class="input w-40"><option value="">Any</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
        <button type="button" class="btn btn-primary ml-auto" @click="open(null)"><Plus class="size-4" aria-hidden="true" /> New {{ current.singular.toLowerCase() }}</button>
      </div>

      <form v-if="editing" class="mt-6 grid gap-4 rounded-md border border-line bg-surface p-5" novalidate @submit.prevent="save">
        <h2 class="font-bold">{{ editing.id ? `Edit ${form.title || current.singular.toLowerCase()}` : `New ${current.singular.toLowerCase()}` }}</h2>
        <p v-if="errors._" class="text-sm text-danger" role="alert">{{ errors._ }}</p>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="field"><label for="e-title">{{ current.title_label ?? 'Title' }}</label><input id="e-title" v-model="form.title" class="input" maxlength="200" :aria-invalid="!!errors.title" /><p v-if="errors.title" class="field-error">{{ errors.title }}</p></div>
          <div v-if="has('slug')" class="field"><label for="e-slug">Address (slug)</label><input id="e-slug" v-model="form.slug" class="input" maxlength="100" placeholder="lower-case-with-dashes" :aria-invalid="!!errors.slug" /><p v-if="errors.slug" class="field-error">{{ errors.slug }}</p></div>
        </div>
        <div v-if="has('summary')" class="field"><label for="e-sum">{{ current.summary_label ?? 'Summary' }}</label><textarea id="e-sum" v-model="form.summary" class="input" rows="2" maxlength="500" /><p v-if="errors.summary" class="field-error">{{ errors.summary }}</p></div>
        <div v-if="has('body')" class="field"><label for="e-body">{{ current.body_label ?? 'Text' }}{{ current.body_required ? '' : ' (optional)' }}</label><textarea id="e-body" v-model="form.body" class="input" rows="8" /><p class="text-xs text-muted">Plain text. Leave an empty line between paragraphs.</p><p v-if="errors.body" class="field-error">{{ errors.body }}</p></div>
        <EntryFields :key="`${current.type}-${editing.id}`" v-model:data="form.data" v-model:media="form.media_asset_id" :type="current" :errors="errors" />
        <div v-if="has('seo')" class="grid gap-4 md:grid-cols-2">
          <div class="field"><label for="e-st">Search title (optional, up to 70)</label><input id="e-st" v-model="form.seo_title" class="input" maxlength="70" /></div>
          <div class="field"><label for="e-sd">Search description (optional, up to 170)</label><input id="e-sd" v-model="form.seo_description" class="input" maxlength="170" /></div>
        </div>
        <div class="grid gap-4 md:grid-cols-4">
          <div class="field"><label for="e-status">Status</label><select id="e-status" v-model="form.status" class="input"><option value="draft">Draft</option><option value="published" :disabled="!canPublish">Published</option><option value="archived" :disabled="!canPublish">Archived</option></select></div>
          <div class="field"><label for="e-pa">Show from (optional)</label><input id="e-pa" v-model="form.publish_at" type="datetime-local" class="input" /></div>
          <div class="field"><label for="e-ea">Show until (optional)</label><input id="e-ea" v-model="form.expires_at" type="datetime-local" class="input" /><p v-if="errors.expires_at" class="field-error">{{ errors.expires_at }}</p></div>
          <div class="field"><label for="e-pos">Order</label><input id="e-pos" v-model.number="form.position" type="number" min="0" class="input" /></div>
        </div>
        <p v-if="!canPublish" class="text-xs text-muted">You can save drafts. Someone with publishing rights makes them public.</p>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="btn btn-primary" :disabled="saving" :aria-busy="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button v-if="publicPath(form) && form.slug" type="button" class="btn btn-quiet" @click="preview"><Eye class="size-4" aria-hidden="true" /> Preview on the website</button>
          <button type="button" class="btn btn-quiet" @click="editing = null">Close</button>
        </div>
      </form>

      <StatusLine v-if="loading && !items.length" state="loading" />
      <StatusLine v-else-if="error" state="error" :message="error" @retry="load">The list could not be loaded.</StatusLine>
      <StatusLine v-else-if="!items.length" state="empty">Nothing here yet.</StatusLine>
      <div v-else class="relative mt-6 overflow-x-auto">
        <table class="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption class="sr-only">{{ current.label }}</caption>
          <thead><tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase"><th scope="col" class="py-2 pr-4">{{ current.title_label ?? 'Title' }}</th><th scope="col" class="py-2 pr-4">Status</th><th scope="col" class="py-2 pr-4">Schedule</th><th scope="col" class="py-2 pr-4">Updated</th><th scope="col" class="py-2"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>
            <tr v-for="e in items" :key="e.id" class="border-b border-line align-top">
              <td class="py-3 pr-4 font-semibold">{{ e.title }}<span v-if="e.slug" class="block text-xs font-normal text-muted">/{{ e.slug }}</span></td>
              <td class="py-3 pr-4">{{ statusLabel[e.status] }}</td>
              <td class="py-3 pr-4 text-xs"><template v-if="e.publish_at">From {{ formatDayTime(e.publish_at) }}<br /></template><template v-if="e.expires_at">Until {{ formatDayTime(e.expires_at) }}</template><template v-if="!e.publish_at && !e.expires_at">Always</template></td>
              <td class="tabular py-3 pr-4 text-xs">{{ formatDayTime(e.updated_at) }}</td>
              <td class="py-3"><div class="flex justify-end gap-2">
                <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Edit ${e.title}`" @click="open(e)">Edit</button>
                <button v-if="e.status !== 'published'" type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Delete ${e.title}`" @click="removing = e">Delete</button>
              </div></td>
            </tr>
          </tbody>
        </table>
        <nav v-if="meta.last_page > 1" class="mt-4 flex items-center gap-3 text-sm" aria-label="Pages">
          <button type="button" class="btn btn-quiet min-h-9 px-3" :disabled="filters.page <= 1" @click="filters.page--">Previous</button>
          <span>Page {{ meta.current_page }} of {{ meta.last_page }} ({{ meta.total }})</span>
          <button type="button" class="btn btn-quiet min-h-9 px-3" :disabled="filters.page >= meta.last_page" @click="filters.page++">Next</button>
        </nav>
      </div>
    </template>
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Content types could not be loaded.</StatusLine>

    <ConfirmDialog :open="!!removing" :title="`Delete ${removing?.title ?? ''}?`" confirm-label="Delete" danger @confirm="remove" @cancel="removing = null">This cannot be undone. The audit log keeps a record.</ConfirmDialog>
  </div>
</template>
