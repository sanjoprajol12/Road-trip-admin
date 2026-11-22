<script setup lang="ts">
import { onMounted, reactive, ref, toRaw } from 'vue'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import type { Destination, Source } from '@/types/api'
import SourcesEditor from '../components/SourcesEditor.vue'
import MapPicker from '../components/MapPicker.vue'
import { listDestinations, saveDestination } from '../services/content'

const provinces = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']
const list = ref<Destination[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    list.value = await listDestinations()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const blank = { id: '', slug: '', name: '', province: '', district: '', summary: '', overview: '', elevation_m: '', latitude: '', longitude: '', photo_path: '', photo_alt: '', photo_credit: '', status: 'draft', last_confirmed_on: '' }
const form = reactive({ ...blank })
const sources = ref<Source[]>([])
const editing = ref(false)
const errors = ref<Record<string, string>>({})
const saveError = ref<string | null>(null)
function edit(d?: Destination) {
  Object.assign(form, blank, d ? Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'sources').map(([k, v]) => [k, v ?? ''])) : {})
  sources.value = structuredClone(toRaw(d?.sources ?? []))
  errors.value = {}
  saveError.value = null
  editing.value = true
}
const saving = ref(false)
async function save() {
  if (saving.value) return // a second click while the first request runs would create a second destination
  saving.value = true
  errors.value = {}
  saveError.value = null
  const body = Object.fromEntries(Object.entries(form).filter(([k]) => k !== 'id' && k !== 'is_dev_seed' && k !== 'updated_at').map(([k, v]) => [k, v === '' ? null : v]))
  try {
    await saveDestination(form.id || null, { ...body, sources: sources.value.map((s) => ({ ...s, publisher: s.publisher || null, url: s.url || null, accessed_on: s.accessed_on || null })) })
    editing.value = false
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) saveError.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="display text-4xl">Destinations</h1><p class="mt-2 text-sm text-muted">Editorial records. Set "last confirmed" only when you checked the facts against a source.</p></div>
      <button type="button" class="btn btn-primary" @click="edit()">New destination</button>
    </div>
    <form v-if="editing" class="mt-6 grid gap-4 rounded-md border border-line bg-surface p-5 md:grid-cols-3" novalidate @submit.prevent="save">
      <h2 class="font-bold md:col-span-3">{{ form.id ? `Edit ${form.name}` : 'New destination' }}</h2>
      <p v-if="saveError" role="alert" class="text-sm text-danger md:col-span-3">{{ saveError }}</p>
      <div class="field"><label for="d-name">Name</label><input id="d-name" v-model="form.name" class="input" /><p v-if="errors.name" class="field-error">{{ errors.name }}</p></div>
      <div class="field"><label for="d-slug">Address (slug)</label><input id="d-slug" v-model="form.slug" class="input" placeholder="lower-case-with-dashes" /><p v-if="errors.slug" class="field-error">{{ errors.slug }}</p></div>
      <div class="field"><label for="d-status">Status</label><select id="d-status" v-model="form.status" class="input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
      <div class="field"><label for="d-prov">Province</label><select id="d-prov" v-model="form.province" class="input"><option value="">Not set</option><option v-for="p in provinces" :key="p" :value="p">{{ p }}</option></select></div>
      <div class="field"><label for="d-dist">District</label><input id="d-dist" v-model="form.district" class="input" /></div>
      <div class="field"><label for="d-conf">Last confirmed</label><input id="d-conf" v-model="form.last_confirmed_on" type="date" class="input" /><p v-if="errors.last_confirmed_on" class="field-error">{{ errors.last_confirmed_on }}</p></div>
      <div class="field md:col-span-3"><label for="d-sum">Summary</label><input id="d-sum" v-model="form.summary" class="input" maxlength="400" /></div>
      <div class="field md:col-span-3"><label for="d-ov">Overview</label><textarea id="d-ov" v-model="form.overview" class="input" rows="6" /></div>
      <div class="field"><label for="d-elev">Elevation (m)</label><input id="d-elev" v-model="form.elevation_m" type="number" class="input" /></div>
      <div class="field"><label for="d-lat">Latitude</label><input id="d-lat" v-model="form.latitude" type="number" step="0.000001" class="input" /><p v-if="errors.latitude" class="field-error">{{ errors.latitude }}</p></div>
      <div class="field"><label for="d-lng">Longitude</label><input id="d-lng" v-model="form.longitude" type="number" step="0.000001" class="input" /><p v-if="errors.longitude" class="field-error">{{ errors.longitude }}</p></div>
      <div class="md:col-span-3"><MapPicker :key="form.id || 'new'" v-model:lat="form.latitude" v-model:lng="form.longitude" /></div>
      <div class="field"><label for="d-ph">Photo path</label><input id="d-ph" v-model="form.photo_path" class="input" placeholder="/images/photos/name" /><p v-if="errors.photo_path" class="field-error">{{ errors.photo_path }}</p></div>
      <div class="field"><label for="d-alt">Photo description</label><input id="d-alt" v-model="form.photo_alt" class="input" /><p v-if="errors.photo_alt" class="field-error">{{ errors.photo_alt }}</p></div>
      <div class="field"><label for="d-cr">Photo credit and licence</label><input id="d-cr" v-model="form.photo_credit" class="input" /><p v-if="errors.photo_credit" class="field-error">{{ errors.photo_credit }}</p></div>
      <SourcesEditor v-model="sources" class="md:col-span-3" :errors="errors" id-prefix="d-src" />
      <div class="flex gap-2 md:col-span-3"><button type="submit" class="btn btn-primary" :disabled="saving" :aria-busy="saving">{{ saving ? 'Saving…' : 'Save' }}</button><button type="button" class="btn btn-quiet" @click="editing = false">Cancel</button></div>
    </form>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Destinations could not be loaded.</StatusLine>
    <StatusLine v-else-if="!list.length" state="empty">No destinations yet.</StatusLine>
    <div v-else class="relative mt-6 overflow-x-auto">
      <table class="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption class="sr-only">Destinations</caption>
        <thead><tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase"><th scope="col" class="py-2 pr-4">Name</th><th scope="col" class="py-2 pr-4">Province</th><th scope="col" class="py-2 pr-4">Status</th><th scope="col" class="py-2 pr-4">Last confirmed</th><th scope="col" class="py-2"><span class="sr-only">Edit</span></th></tr></thead>
        <tbody>
          <tr v-for="d in list" :key="d.id" class="border-b border-line">
            <td class="py-3 pr-4 font-semibold">{{ d.name }}<span v-if="d.is_dev_seed" class="ml-2 text-xs font-normal text-warning">dev seed</span></td>
            <td class="py-3 pr-4">{{ d.province ?? '–' }}</td>
            <td class="py-3 pr-4 capitalize">{{ d.status }}</td>
            <td class="tabular py-3 pr-4">{{ d.last_confirmed_on ? formatDay(d.last_confirmed_on) : 'Never' }}</td>
            <td class="py-3 text-right"><button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Edit ${d.name}`" @click="edit(d)">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
