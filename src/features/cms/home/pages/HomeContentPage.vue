<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Eye, Plus, Send } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useStaff } from '@/features/authentication/staffAccess'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import FieldEditor from '../components/FieldEditor.vue'
import { sectionSchemas } from '../sectionSchemas'
import { addSection, archiveSection, listSections, pickerOptions, previewLink, publishHome, reorderSections, updateSection } from '../services/home'
import type { SectionRow } from '../types'

// The public homepage, section by section. Every change is a draft until "Publish homepage".
const { can } = useStaff()
const sections = ref<SectionRow[]>([])
const types = ref<{ type: string; label: string }[]>([])
const bundled = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const done = ref<string | null>(null)
const actionError = ref<string | null>(null)
const label = (type: string) => types.value.find((t) => t.type === type)?.label ?? type
const active = computed(() => sections.value.filter((s) => !s.archived))
const archived = computed(() => sections.value.filter((s) => s.archived))
const unpublished = computed(() => active.value.some((s) => s.changed))

async function load() {
  loading.value = true
  error.value = null
  try {
    const r = await listSections()
    sections.value = r.data
    types.value = r.types
    bundled.value = r.bundled_photos
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function act(fn: () => Promise<unknown>, message: string) {
  actionError.value = null
  try {
    await fn()
    done.value = message
    await load()
  } catch (e) {
    actionError.value = errorMessage(e)
  }
}
const move = (i: number, step: number) => {
  const ids = active.value.map((s) => s.id)
  const [x] = ids.splice(i, 1)
  ids.splice(i + step, 0, x!)
  return act(() => reorderSections(ids), 'Order saved as a draft.')
}
const newType = ref('')
const add = () => act(() => addSection(newType.value), 'Section added (hidden until you show it and publish).').then(() => (newType.value = ''))

// Editing: a copy of the section's data; choices for images and featured items load once.
const editing = ref<SectionRow | null>(null)
const draft = ref<Record<string, unknown>>({})
const editErrors = ref<Record<string, string>>({})
const options = ref<Record<string, { id: string; label: string }[]>>({})
async function edit(s: SectionRow) {
  editing.value = s
  draft.value = JSON.parse(JSON.stringify(s.data))
  editErrors.value = {}
  if (!Object.keys(options.value).length) {
    const pick = async (kind: 'destinations' | 'routes' | 'media' | 'contributions') =>
      (await pickerOptions(kind).catch(() => [])).filter((o) => kind === 'media' || kind === 'contributions' || o.status === 'published').map((o) => ({ id: o.id, label: o.name ?? o.title ?? o.alt ?? o.id }))
    const [destinations, routes, media, contributions] = await Promise.all([pick('destinations'), pick('routes'), pick('media'), pick('contributions')])
    options.value = { destinations, routes, media, contributions }
  }
}
async function saveEdit() {
  if (!editing.value) return
  editErrors.value = {}
  try {
    await updateSection(editing.value.id, { data: draft.value })
    done.value = `${label(editing.value.type)} saved as a draft.`
    editing.value = null
    await load()
  } catch (e) {
    editErrors.value = fieldErrors(e)
    if (!Object.keys(editErrors.value).length) editErrors.value = { _: errorMessage(e) }
  }
}
const local = (iso: string | null) => (iso ? iso.slice(0, 16) : '')
const schedule = (s: SectionRow, key: 'publish_at' | 'expires_at', value: string) => act(() => updateSection(s.id, { [key]: value ? new Date(value).toISOString() : null }), 'Schedule saved.')

async function preview() {
  actionError.value = null
  try {
    window.open(await previewLink(), '_blank', 'noopener')
  } catch (e) {
    actionError.value = errorMessage(e)
  }
}
const confirmPublish = ref(false)
const publish = () => act(async () => { await publishHome(); confirmPublish.value = false }, 'The homepage is published.')
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Homepage</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Change the words, images, buttons, featured items, order and visibility of each section. Changes are drafts: preview them, then publish. The page layout and style stay as designed. Every change is in the audit log.</p>
    <div class="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" class="btn btn-quiet" @click="preview"><Eye class="size-4" aria-hidden="true" /> Preview drafts</button>
      <button v-if="can('cms.home.publish')" type="button" class="btn btn-primary" :disabled="!unpublished" @click="confirmPublish = true"><Send class="size-4" aria-hidden="true" /> Publish homepage</button>
      <span class="text-sm text-muted">{{ unpublished ? 'There are unpublished changes.' : 'Everything is published.' }}</span>
    </div>
    <p v-if="done" class="mt-4 text-sm text-success" role="status">{{ done }}</p>
    <p v-if="actionError" class="mt-4 rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">{{ actionError }}</p>

    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">The homepage sections could not be loaded.</StatusLine>
    <template v-else>
      <ol class="mt-6 grid max-w-3xl gap-3" aria-label="Homepage sections, top to bottom">
        <li v-for="(s, i) in active" :key="s.id" class="grid gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-[1fr_auto]">
          <div class="grid gap-1">
            <p class="font-semibold">{{ label(s.type) }}<span v-if="!s.is_visible" class="ml-2 text-xs font-normal text-muted">Hidden</span><span v-if="s.changed" class="ml-2 text-xs font-normal text-warning">Draft changes</span></p>
            <p class="truncate text-sm text-muted">{{ (s.data.heading ?? (s.data.lines as string[] | undefined)?.join(' ')) || '' }}</p>
            <div class="flex flex-wrap gap-3 text-xs text-muted">
              <label class="flex items-center gap-1">From <input type="datetime-local" class="input min-h-8 py-0 text-xs" :value="local(s.publish_at)" :aria-label="`Show ${label(s.type)} from`" @change="schedule(s, 'publish_at', ($event.target as HTMLInputElement).value)" /></label>
              <label class="flex items-center gap-1">Until <input type="datetime-local" class="input min-h-8 py-0 text-xs" :value="local(s.expires_at)" :aria-label="`Show ${label(s.type)} until`" @change="schedule(s, 'expires_at', ($event.target as HTMLInputElement).value)" /></label>
            </div>
          </div>
          <div class="flex flex-wrap items-start justify-end gap-2">
            <button type="button" class="btn btn-quiet min-h-9 px-2" :disabled="i === 0" :aria-label="`Move ${label(s.type)} up`" @click="move(i, -1)"><ArrowUp class="size-4" aria-hidden="true" /></button>
            <button type="button" class="btn btn-quiet min-h-9 px-2" :disabled="i === active.length - 1" :aria-label="`Move ${label(s.type)} down`" @click="move(i, 1)"><ArrowDown class="size-4" aria-hidden="true" /></button>
            <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" @click="act(() => updateSection(s.id, { is_visible: !s.is_visible }), s.is_visible ? 'Section hidden (draft).' : 'Section shown (draft).')">{{ s.is_visible ? 'Hide' : 'Show' }}</button>
            <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Edit ${label(s.type)}`" @click="edit(s)">Edit</button>
            <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Archive ${label(s.type)}`" @click="act(() => archiveSection(s.id), 'Section archived.')">Archive</button>
          </div>
        </li>
      </ol>
      <form class="mt-6 flex max-w-xl items-end gap-2" @submit.prevent="add">
        <div class="field flex-1"><label for="nt">Add a section</label><select id="nt" v-model="newType" class="input"><option value="" disabled>Choose a type</option><option v-for="t in types" :key="t.type" :value="t.type">{{ t.label }}</option></select></div>
        <button type="submit" class="btn btn-quiet" :disabled="!newType"><Plus class="size-4" aria-hidden="true" /> Add</button>
      </form>
      <section v-if="archived.length" class="mt-10 max-w-3xl" aria-labelledby="arch-title">
        <h2 id="arch-title" class="text-sm font-semibold">Archived sections</h2>
        <ul class="mt-2 grid border-t border-line text-sm">
          <li v-for="s in archived" :key="s.id" class="flex items-center justify-between gap-2 border-b border-line py-2">
            <span>{{ label(s.type) }} · {{ s.data.heading ?? '' }}</span>
            <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" @click="act(() => archiveSection(s.id, true), 'Section restored.')">Restore</button>
          </li>
        </ul>
      </section>
    </template>

    <ConfirmDialog :open="!!editing" :title="editing ? `Edit ${label(editing.type)}` : ''" confirm-label="Save draft" @confirm="saveEdit" @cancel="editing = null">
      <div v-if="editing" class="grid max-h-[65vh] gap-4 overflow-y-auto pr-1 text-ink">
        <p v-if="editErrors._" class="text-sm text-danger" role="alert">{{ editErrors._ }}</p>
        <p v-else-if="Object.keys(editErrors).length" class="text-sm text-danger" role="alert">Some fields need attention.</p>
        <FieldEditor v-for="f in sectionSchemas[editing.type] ?? []" :key="f.key" :field="f" :model="draft" :errors="editErrors" path="" :options="options" :bundled="bundled" />
      </div>
    </ConfirmDialog>
    <ConfirmDialog :open="confirmPublish" title="Publish the homepage?" confirm-label="Publish" @confirm="publish" @cancel="confirmPublish = false">
      Every draft change (text, images, order, visibility) goes live on the public website now. The previous version is kept in the audit log.
    </ConfirmDialog>
  </div>
</template>
