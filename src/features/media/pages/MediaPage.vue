<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ImagePlus, Search } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import { deleteMedia, getUploadState, listMedia, updateMedia, uploadMedia } from '../services/media'

// Images for branding, pages and destinations. Owner rule: CC0, public domain or owner-supplied only,
// each with a credit and, for photos, only of the place they show. The server re-encodes every file.
interface Asset { id: string; url: string; width: number; height: number; size_bytes: number; alt: string; credit: string; license: License; source_url: string | null; place_note: string | null; created_at: string; usages: number }
type License = 'cc0' | 'public_domain' | 'owner_supplied'
const licenses: Record<License, string> = { cc0: 'CC0', public_domain: 'Public domain', owner_supplied: 'Supplied by the owner' }

const assets = ref<Asset[]>([])
const query = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const done = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    assets.value = await listMedia<Asset>(query.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
// Uploads can be paused (no durable storage in this environment, or paused by staff); browsing, editing and deleting continue.
const uploadState = ref<{ enabled: boolean; message: string | null } | null>(null)
onMounted(async () => (uploadState.value = await getUploadState().catch(() => null)))

const fileInput = ref<HTMLInputElement | null>(null)
const form = reactive({ file: null as File | null, alt: '', credit: '', license: '' as License | '', source_url: '', place_note: '' })
const errors = ref<Record<string, string>>({})
const uploading = ref(false)
async function upload() {
  if (!form.file) return
  uploading.value = true
  errors.value = {}
  const fd = new FormData()
  fd.append('file', form.file)
  for (const k of ['alt', 'credit', 'license', 'source_url', 'place_note'] as const) if (form[k]) fd.append(k, form[k])
  try {
    await uploadMedia(fd)
    done.value = 'Image added to the library.'
    Object.assign(form, { file: null, alt: '', credit: '', license: '', source_url: '', place_note: '' })
    if (fileInput.value) fileInput.value.value = ''
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { _: errorMessage(e) }
  } finally {
    uploading.value = false
  }
}

const editing = ref<Asset | null>(null)
const editErrors = ref<Record<string, string>>({})
async function saveEdit() {
  if (!editing.value) return
  const a = editing.value
  editErrors.value = {}
  try {
    await updateMedia(a.id, { alt: a.alt, credit: a.credit, license: a.license, source_url: a.source_url || null, place_note: a.place_note || null })
    done.value = 'Image details saved.'
    editing.value = null
    await load()
  } catch (e) {
    editErrors.value = fieldErrors(e)
    if (!Object.keys(editErrors.value).length) editErrors.value = { _: errorMessage(e) }
  }
}

const deleting = ref<Asset | null>(null)
async function remove() {
  if (!deleting.value) return
  try {
    await deleteMedia(deleting.value.id)
    done.value = 'Image deleted.'
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    deleting.value = null
  }
}
const kb = (b: number) => `${Math.round(b / 1024)} KB`
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Media</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Only CC0, public-domain or owner-supplied images, each with a credit. Photos may show only the place they are used for. Location data is removed from every file.</p>
    <p v-if="done" class="mt-4 text-sm text-success" role="status">{{ done }}</p>

    <p v-if="uploadState && !uploadState.enabled" class="mt-6 max-w-2xl rounded-md border border-line bg-surface p-5 text-sm" role="status">{{ uploadState.message }} Existing images can still be used, edited and removed.</p>
    <form v-else class="mt-6 grid max-w-2xl gap-4 rounded-md border border-line bg-surface p-5" novalidate @submit.prevent="upload">
      <h2 class="font-semibold">Add an image</h2>
      <p v-if="errors._" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">{{ errors._ }}</p>
      <div class="field"><label for="mf">Image file</label><input id="mf" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="text-sm" :aria-invalid="!!errors.file" @change="form.file = ($event.target as HTMLInputElement).files?.[0] ?? null" /><p v-if="errors.file" class="field-error">{{ errors.file }}</p></div>
      <div class="field"><label for="ma">Description (alt text)</label><input id="ma" v-model="form.alt" class="input" maxlength="200" :aria-invalid="!!errors.alt" /><p v-if="errors.alt" class="field-error">{{ errors.alt }}</p></div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="field"><label for="mc">Credit</label><input id="mc" v-model="form.credit" class="input" maxlength="200" :aria-invalid="!!errors.credit" /><p v-if="errors.credit" class="field-error">{{ errors.credit }}</p></div>
        <div class="field"><label for="ml">Licence</label><select id="ml" v-model="form.license" class="input" :aria-invalid="!!errors.license"><option value="" disabled>Choose one</option><option v-for="(l, k) in licenses" :key="k" :value="k">{{ l }}</option></select><p v-if="errors.license" class="field-error">{{ errors.license }}</p></div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="field"><label for="ms">Source link <span class="font-normal text-muted">(optional)</span></label><input id="ms" v-model="form.source_url" type="url" class="input" :aria-invalid="!!errors.source_url" /><p v-if="errors.source_url" class="field-error">{{ errors.source_url }}</p></div>
        <div class="field"><label for="mp">Place shown <span class="font-normal text-muted">(photos)</span></label><input id="mp" v-model="form.place_note" class="input" maxlength="200" /></div>
      </div>
      <button type="submit" class="btn btn-primary justify-self-start" :disabled="!form.file || uploading" :aria-busy="uploading"><ImagePlus class="size-4" aria-hidden="true" /> {{ uploading ? 'Uploading…' : 'Add image' }}</button>
    </form>

    <form class="mt-10 flex max-w-xl items-end gap-2" role="search" @submit.prevent="load">
      <div class="field flex-1">
        <label for="mq">Search by description, credit or place</label>
        <div class="relative"><Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input id="mq" v-model="query" type="search" class="input pl-9" /></div>
      </div>
      <button type="submit" class="btn btn-quiet">Search</button>
    </form>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">The library could not be loaded or changed.</StatusLine>
    <StatusLine v-else-if="!assets.length" state="empty">No images yet.</StatusLine>
    <ul v-else class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Library images">
      <li v-for="a in assets" :key="a.id" class="grid gap-2 rounded-md border border-line bg-surface p-3 text-sm">
        <img :src="a.url" :alt="a.alt" class="aspect-4/3 w-full rounded object-cover" loading="lazy" :width="a.width" :height="a.height" />
        <span class="font-semibold">{{ a.alt }}</span>
        <span class="text-xs text-muted">{{ a.credit }} · {{ licenses[a.license] }} · {{ a.width }}×{{ a.height }}, {{ kb(a.size_bytes) }} · {{ formatDay(a.created_at) }}</span>
        <span class="text-xs text-muted">{{ a.usages ? `Used in ${a.usages} ${a.usages === 1 ? 'place' : 'places'}` : 'Not used yet' }}</span>
        <div class="flex gap-2">
          <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Edit details of ${a.alt}`" @click="(editing = { ...a }), (editErrors = {})">Edit</button>
          <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Delete ${a.alt}`" @click="deleting = a">Delete</button>
        </div>
      </li>
    </ul>

    <ConfirmDialog :open="!!editing" title="Image details" confirm-label="Save" @confirm="saveEdit" @cancel="editing = null">
      <div v-if="editing" class="grid gap-3 text-ink">
        <p v-if="editErrors._" class="text-sm text-danger" role="alert">{{ editErrors._ }}</p>
        <div class="field"><label for="ea">Description (alt text)</label><input id="ea" v-model="editing.alt" class="input" /><p v-if="editErrors.alt" class="field-error">{{ editErrors.alt }}</p></div>
        <div class="field"><label for="ec">Credit</label><input id="ec" v-model="editing.credit" class="input" /><p v-if="editErrors.credit" class="field-error">{{ editErrors.credit }}</p></div>
        <div class="field"><label for="el">Licence</label><select id="el" v-model="editing.license" class="input"><option v-for="(l, k) in licenses" :key="k" :value="k">{{ l }}</option></select></div>
        <div class="field"><label for="ep">Place shown</label><input id="ep" v-model="editing.place_note" class="input" /></div>
      </div>
    </ConfirmDialog>
    <ConfirmDialog :open="!!deleting" :title="deleting ? `Delete ${deleting.alt}?` : ''" confirm-label="Delete image" danger @confirm="remove" @cancel="deleting = null">
      Images in use cannot be deleted. Replace them where they are used first.
    </ConfirmDialog>
  </div>
</template>
