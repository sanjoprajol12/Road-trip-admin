<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { Eye, History } from 'lucide-vue-next'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import { useStaff } from '@/features/authentication/staffAccess'
import { listMedia } from '@/features/media/services/media'
import { previewLink } from '@/features/cms/home/services/home'
import { listDestinations } from '@/features/content/services/content'
import MapPicker from '@/features/content/components/MapPicker.vue'
import SourcesEditor from '@/features/content/components/SourcesEditor.vue'
import type { Destination, Source } from '@/types/api'
import { decidePlace, placeCategories, placeHistory, placeStatuses, savePlace, type PlaceEvent, type PlaceRow } from '../services/places'

// Create or edit one place, then publish or review it. The API enforces every rule; buttons only reflect permissions.
const props = defineProps<{ place: PlaceRow | null }>()
const emit = defineEmits<{ saved: [PlaceRow]; close: [] }>()
const { can } = useStaff()
const p = props.place
const form = reactive({
  name: p?.name ?? '', slug: p?.slug ?? '', category: p?.category ?? '', summary: p?.summary ?? '', description: p?.description ?? '',
  latitude: (p?.position[0] ?? '') as string | number | null, longitude: (p?.position[1] ?? '') as string | number | null,
  destination_id: p?.destination_id ?? '', media_asset_id: p?.media_asset_id ?? '', gallery: [...(p?.gallery_ids ?? [])] as string[],
  observed_on: p?.observed_on ?? '', last_confirmed_on: p?.last_confirmed_on ?? '', allow_duplicate: false,
})
const sources = ref<Source[]>(structuredClone(toRaw(p?.sources ?? [])))
const errors = ref<Record<string, string>>({})
const msg = ref<string | null>(null)
const busy = ref(false)
const destinations = ref<Destination[]>([])
const assets = ref<{ id: string; url: string; alt: string }[]>([])
onMounted(async () => {
  ;[destinations.value, assets.value] = await Promise.all([listDestinations(), listMedia<{ id: string; url: string; alt: string }>('')]).catch(() => [[], []])
})
const isDuplicate = computed(() => (errors.value.name ?? '').includes('already exists'))

async function save() {
  busy.value = true
  errors.value = {}
  msg.value = null
  const nul = (v: string | number | null) => (v === '' ? null : v)
  try {
    const saved = await savePlace(p?.id ?? null, {
      ...form, slug: nul(form.slug), summary: nul(form.summary), description: nul(form.description), destination_id: nul(form.destination_id),
      media_asset_id: nul(form.media_asset_id), observed_on: nul(form.observed_on), last_confirmed_on: nul(form.last_confirmed_on),
      sources: sources.value.map((s) => ({ ...s, publisher: s.publisher || null, url: s.url || null, accessed_on: s.accessed_on || null })),
    })
    msg.value = 'Place saved.'
    emit('saved', saved)
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) msg.value = errorMessage(e)
  } finally {
    busy.value = false
  }
}

const note = ref('')
async function decide(decision: string) {
  if (!p) return
  busy.value = true
  msg.value = null
  try {
    emit('saved', await decidePlace(p.id, decision, note.value || null))
    note.value = ''
  } catch (e) {
    const f = fieldErrors(e)
    msg.value = f.note ?? f.decision ?? errorMessage(e)
  } finally {
    busy.value = false
  }
}
const decisions = computed(() => {
  const s = p?.status
  return [
    ['publish', 'Publish', ['draft', 'pending_review', 'changes_requested', 'archived']],
    ['request_changes', 'Ask for changes', p?.suggested_by_rider ? ['pending_review'] : []],
    ['reject', 'Reject', ['pending_review', 'changes_requested']],
    ['unpublish', 'Unpublish', ['published']],
    ['archive', 'Archive', ['draft', 'published', 'rejected']],
  ].filter(([, , from]) => (from as string[]).includes(s ?? '')) as [string, string, string[]][]
})
async function preview() {
  if (!p) return
  const url = new URL(await previewLink())
  url.pathname = `/places/${p.slug}`
  window.open(url.toString(), '_blank', 'noopener')
}
const history = ref<PlaceEvent[] | null>(null)
async function toggleHistory() {
  if (!p) return
  history.value = history.value ? null : await placeHistory(p.id).catch(() => [])
}
const toggleGallery = (id: string) => (form.gallery.includes(id) ? form.gallery.splice(form.gallery.indexOf(id), 1) : form.gallery.push(id))
</script>

<template>
  <section class="mt-6 grid gap-4 rounded-md border border-line bg-surface p-5" :aria-label="p ? `Edit ${p.name}` : 'New place'">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 class="font-bold">{{ p ? `Edit ${p.name}` : 'New place' }}</h2>
      <p v-if="p" class="text-sm"><span class="font-semibold">{{ placeStatuses[p.status] }}</span><template v-if="p.submitted_by_name"> · suggested by {{ p.submitted_by_name }}</template></p>
    </div>
    <p v-if="p?.moderation_note" class="text-sm"><span class="font-semibold">Note to the rider:</span> {{ p.moderation_note }}</p>
    <form class="grid gap-4 md:grid-cols-3" novalidate @submit.prevent="save">
      <div class="field"><label for="pl-name">Name</label><input id="pl-name" v-model="form.name" class="input" maxlength="120" :aria-invalid="!!errors.name" /><p v-if="errors.name" class="field-error">{{ errors.name }}</p></div>
      <div class="field"><label for="pl-slug">Address (slug)</label><input id="pl-slug" v-model="form.slug" class="input" maxlength="100" placeholder="made from the name if empty" /><p v-if="errors.slug" class="field-error">{{ errors.slug }}</p></div>
      <div class="field"><label for="pl-cat">Category</label><select id="pl-cat" v-model="form.category" class="input" :aria-invalid="!!errors.category"><option value="" disabled>Choose</option><option v-for="(l, k) in placeCategories" :key="k" :value="k">{{ l }}</option></select><p v-if="errors.category" class="field-error">{{ errors.category }}</p></div>
      <div class="field md:col-span-3"><label for="pl-sum">Summary</label><input id="pl-sum" v-model="form.summary" class="input" maxlength="300" /></div>
      <div class="field md:col-span-3"><label for="pl-desc">Description</label><textarea id="pl-desc" v-model="form.description" class="input" rows="5" maxlength="5000" /><p v-if="errors.description" class="field-error">{{ errors.description }}</p></div>
      <div class="md:col-span-3"><MapPicker v-model:lat="form.latitude" v-model:lng="form.longitude" /></div>
      <div class="field"><label for="pl-lat">Latitude</label><input id="pl-lat" v-model="form.latitude" type="number" step="0.000001" class="input" :aria-invalid="!!errors.latitude" /><p v-if="errors.latitude" class="field-error">{{ errors.latitude }}</p></div>
      <div class="field"><label for="pl-lng">Longitude</label><input id="pl-lng" v-model="form.longitude" type="number" step="0.000001" class="input" :aria-invalid="!!errors.longitude" /><p v-if="errors.longitude" class="field-error">{{ errors.longitude }}</p></div>
      <div class="field"><label for="pl-dest">Part of destination</label><select id="pl-dest" v-model="form.destination_id" class="input"><option value="">None</option><option v-for="d in destinations" :key="d.id" :value="d.id">{{ d.name }}</option></select></div>
      <div class="field"><label for="pl-obs">Observed on</label><input id="pl-obs" v-model="form.observed_on" type="date" class="input" /><p v-if="errors.observed_on" class="field-error">{{ errors.observed_on }}</p></div>
      <div class="field"><label for="pl-conf">Last confirmed</label><input id="pl-conf" v-model="form.last_confirmed_on" type="date" class="input" /><p v-if="errors.last_confirmed_on" class="field-error">{{ errors.last_confirmed_on }}</p></div>
      <div class="field"><label for="pl-img">Main image (media library)</label><select id="pl-img" v-model="form.media_asset_id" class="input"><option value="">No image</option><option v-for="a in assets" :key="a.id" :value="a.id">{{ a.alt }}</option></select></div>
      <fieldset v-if="assets.length" class="grid gap-1 md:col-span-3"><legend class="text-sm font-semibold">More images (up to 8)</legend>
        <label v-for="a in assets" :key="a.id" class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="form.gallery.includes(a.id)" @change="toggleGallery(a.id)" /> {{ a.alt }}</label>
        <p v-if="errors.gallery" class="field-error">{{ errors.gallery }}</p>
      </fieldset>
      <SourcesEditor v-model="sources" class="md:col-span-3" :errors="errors" id-prefix="pl-src" />
      <label v-if="isDuplicate" class="flex items-center gap-2 text-sm md:col-span-3"><input v-model="form.allow_duplicate" type="checkbox" /> This is a different place; save it anyway</label>
      <div class="flex flex-wrap gap-2 md:col-span-3">
        <button type="submit" class="btn btn-primary" :disabled="busy">Save</button>
        <button v-if="p" type="button" class="btn btn-quiet" @click="preview"><Eye class="size-4" aria-hidden="true" /> Preview on the website</button>
        <button type="button" class="btn btn-quiet" @click="emit('close')">Close</button>
      </div>
    </form>

    <div v-if="p && can('places.publish') && decisions.length" class="grid gap-2 border-t border-line pt-4">
      <h3 class="font-semibold">Decision</h3>
      <div class="field"><label for="pl-note">Reason (required to reject or ask for changes; the rider sees it)</label><textarea id="pl-note" v-model="note" class="input" rows="2" maxlength="2000" /></div>
      <div class="flex flex-wrap gap-2"><button v-for="[d, label] in decisions" :key="d" type="button" class="btn" :class="d === 'publish' ? 'btn-primary' : 'btn-quiet'" :disabled="busy" @click="decide(d)">{{ label }}</button></div>
    </div>
    <p v-if="msg" class="text-sm" role="status">{{ msg }}</p>
    <div v-if="p">
      <button type="button" class="link inline-flex items-center gap-1 text-sm" :aria-expanded="!!history" @click="toggleHistory"><History class="size-4" aria-hidden="true" /> {{ history ? 'Hide history' : 'History' }}</button>
      <ol v-if="history" class="mt-2 grid gap-1 text-sm" aria-label="History">
        <li v-if="!history.length" class="text-muted">No recorded actions.</li>
        <li v-for="(h, i) in history" :key="i"><span class="text-muted">{{ formatDayTime(h.at) }}</span> · {{ h.action.replace('place.', '').replaceAll('_', ' ') }} · {{ h.actor }}{{ h.actor_type === 'user' ? ' (rider)' : '' }}<template v-if="h.note">: {{ h.note }}</template></li>
      </ol>
    </div>
  </section>
</template>
