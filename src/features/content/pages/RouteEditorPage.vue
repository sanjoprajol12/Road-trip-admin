<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowLeft, ArrowUp, Trash2 } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import type { Destination, RideRoute, Segment } from '@/types/api'
import { createServicePoint, deleteServicePoint, getRoute, listDestinations, replaceSegments, updateRoute } from '../services/content'

const props = defineProps<{ id: string }>()
const route = ref<RideRoute | null>(null)
const destinations = ref<Destination[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const msg = ref<string | null>(null)
const details = reactive({ name: '', slug: '', summary: '', start_destination_id: '', end_destination_id: '', distance_km: '', estimated_hours: '', status: 'draft', last_confirmed_on: '' })
type SegRow = { id: string | null; start_name: string; end_name: string; start_lat: string; start_lng: string; end_lat: string; end_lng: string; distance_km: string; surface: Segment['surface']; notes: string }
const segs = ref<SegRow[]>([])
const errors = ref<Record<string, string>>({})

function fill(r: RideRoute) {
  route.value = r
  Object.assign(details, { name: r.name, slug: r.slug, summary: r.summary ?? '', start_destination_id: r.start?.id ?? '', end_destination_id: r.end?.id ?? '', distance_km: r.distance_km ?? '', estimated_hours: r.estimated_hours ?? '', status: r.status, last_confirmed_on: r.last_confirmed_on ?? '' })
  segs.value = (r.segments ?? []).map((s) => ({ id: s.id, start_name: s.start_name, end_name: s.end_name, start_lat: String(s.start?.[0] ?? ''), start_lng: String(s.start?.[1] ?? ''), end_lat: String(s.end?.[0] ?? ''), end_lng: String(s.end?.[1] ?? ''), distance_km: String(s.distance_km ?? ''), surface: s.surface, notes: s.notes ?? '' }))
}
async function load() {
  loading.value = true
  error.value = null
  try {
    const [r, d] = await Promise.all([getRoute(props.id), listDestinations()])
    fill(r)
    destinations.value = d
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
const nul = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === '' ? null : v]))
async function saveDetails() {
  errors.value = {}
  msg.value = null
  try {
    fill(await updateRoute(props.id, nul(details)))
    msg.value = 'Route saved.'
  } catch (e) {
    errors.value = fieldErrors(e)
    msg.value = Object.keys(errors.value).length ? null : errorMessage(e)
  }
}
async function saveSegments() {
  errors.value = {}
  msg.value = null
  try {
    fill(await replaceSegments(props.id, segs.value.map((s) => nul(s))))
    msg.value = 'Segments saved. Existing segments kept their reports.'
  } catch (e) {
    errors.value = fieldErrors(e)
    msg.value = Object.values(errors.value)[0] ?? errorMessage(e)
  }
}
const move = (i: number, d: number) => {
  const a = segs.value
  const j = i + d
  if (j < 0 || j >= a.length) return
  ;[a[i], a[j]] = [a[j]!, a[i]!]
}
const addSeg = () => segs.value.push({ id: null, start_name: segs.value.at(-1)?.end_name ?? '', end_name: '', start_lat: '', start_lng: '', end_lat: '', end_lng: '', distance_km: '', surface: 'unknown', notes: '' })

const svc = reactive({ segment: '', kind: 'fuel', name: '', notes: '', status: 'draft', last_confirmed_on: '' })
async function addService() {
  msg.value = null
  try {
    await createServicePoint({ route_segment_id: svc.segment, kind: svc.kind, name: svc.name, notes: svc.notes || null, status: svc.status, last_confirmed_on: svc.last_confirmed_on || null })
    svc.name = ''
    svc.notes = ''
    await load()
    msg.value = 'Service point added.'
  } catch (e) {
    msg.value = errorMessage(e)
  }
}
async function removeService(id: string) {
  try {
    await deleteServicePoint(id)
    await load()
  } catch (e) {
    msg.value = errorMessage(e)
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <RouterLink to="/routes" class="link inline-flex items-center gap-1.5 text-sm font-semibold"><ArrowLeft class="size-4" aria-hidden="true" /> Routes</RouterLink>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error || !route" state="error" :message="error" @retry="load">This route could not be loaded.</StatusLine>
    <template v-else>
      <h1 class="display mt-4 text-4xl">{{ route.name }}</h1>
      <p v-if="msg" class="mt-3 text-sm" role="status">{{ msg }}</p>

      <form class="mt-6 grid gap-4 md:grid-cols-3" novalidate @submit.prevent="saveDetails">
        <div class="field"><label for="rn">Name</label><input id="rn" v-model="details.name" class="input" /><p v-if="errors.name" class="field-error">{{ errors.name }}</p></div>
        <div class="field"><label for="rs">Address (slug)</label><input id="rs" v-model="details.slug" class="input" /><p v-if="errors.slug" class="field-error">{{ errors.slug }}</p></div>
        <div class="field"><label for="rst">Status</label><select id="rst" v-model="details.status" class="input"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
        <div class="field"><label for="rfrom">From</label><select id="rfrom" v-model="details.start_destination_id" class="input"><option value="">Not set</option><option v-for="d in destinations" :key="d.id" :value="d.id">{{ d.name }}</option></select></div>
        <div class="field"><label for="rto">To</label><select id="rto" v-model="details.end_destination_id" class="input"><option value="">Not set</option><option v-for="d in destinations" :key="d.id" :value="d.id">{{ d.name }}</option></select></div>
        <div class="field"><label for="rc">Last confirmed</label><input id="rc" v-model="details.last_confirmed_on" type="date" class="input" /></div>
        <div class="field"><label for="rk">Distance (km)</label><input id="rk" v-model="details.distance_km" type="number" step="0.1" class="input" /></div>
        <div class="field"><label for="rh">Riding time (h)</label><input id="rh" v-model="details.estimated_hours" type="number" step="0.1" class="input" /></div>
        <div class="field md:col-span-3"><label for="rsum">Summary</label><input id="rsum" v-model="details.summary" class="input" maxlength="400" /></div>
        <button type="submit" class="btn btn-primary justify-self-start">Save route</button>
      </form>

      <section class="mt-12" aria-labelledby="sg">
        <h2 id="sg" class="text-xl font-bold">Segments</h2>
        <p class="mt-1 text-sm text-muted">In riding order. Coordinates are optional (Nepal: latitude 26 to 31, longitude 80 to 89).</p>
        <ol class="mt-4 grid gap-4">
          <li v-for="(s, i) in segs" :key="s.id ?? `new-${i}`" class="grid gap-3 rounded-md border border-line bg-surface p-4 md:grid-cols-6">
            <p class="font-semibold md:col-span-6">Segment {{ i + 1 }}<span v-if="!s.id" class="text-muted"> (new)</span></p>
            <div class="field md:col-span-3"><label :for="`sa-${i}`">From checkpoint</label><input :id="`sa-${i}`" v-model="s.start_name" class="input" /></div>
            <div class="field md:col-span-3"><label :for="`sb-${i}`">To checkpoint</label><input :id="`sb-${i}`" v-model="s.end_name" class="input" /></div>
            <div class="field"><label :for="`sla-${i}`">From lat</label><input :id="`sla-${i}`" v-model="s.start_lat" class="input" inputmode="decimal" /></div>
            <div class="field"><label :for="`sln-${i}`">From lng</label><input :id="`sln-${i}`" v-model="s.start_lng" class="input" inputmode="decimal" /></div>
            <div class="field"><label :for="`ela-${i}`">To lat</label><input :id="`ela-${i}`" v-model="s.end_lat" class="input" inputmode="decimal" /></div>
            <div class="field"><label :for="`eln-${i}`">To lng</label><input :id="`eln-${i}`" v-model="s.end_lng" class="input" inputmode="decimal" /></div>
            <div class="field"><label :for="`sd-${i}`">Distance (km)</label><input :id="`sd-${i}`" v-model="s.distance_km" class="input" inputmode="decimal" /></div>
            <div class="field"><label :for="`ss-${i}`">Surface</label><select :id="`ss-${i}`" v-model="s.surface" class="input"><option v-for="x in ['paved', 'mixed', 'gravel', 'dirt', 'unknown']" :key="x" :value="x">{{ x }}</option></select></div>
            <div class="field md:col-span-6"><label :for="`sn-${i}`">Notes</label><input :id="`sn-${i}`" v-model="s.notes" class="input" /></div>
            <div class="flex gap-2 md:col-span-6">
              <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Move segment ${i + 1} up`" @click="move(i, -1)"><ArrowUp class="size-4" aria-hidden="true" /></button>
              <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Move segment ${i + 1} down`" @click="move(i, 1)"><ArrowDown class="size-4" aria-hidden="true" /></button>
              <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Remove segment ${i + 1}`" @click="segs.splice(i, 1)"><Trash2 class="size-4" aria-hidden="true" /></button>
            </div>
            <ul v-if="route.segments?.find((x) => x.id === s.id)?.services.length" class="grid gap-1 text-sm md:col-span-6">
              <li v-for="p in route.segments.find((x) => x.id === s.id)!.services" :key="p.id" class="flex items-center gap-2">{{ p.kind }}: {{ p.name }}<button type="button" class="link text-danger" @click="removeService(p.id)">remove</button></li>
            </ul>
          </li>
        </ol>
        <div class="mt-4 flex gap-2"><button type="button" class="btn btn-quiet" @click="addSeg">Add segment</button><button type="button" class="btn btn-primary" @click="saveSegments">Save segments</button></div>
      </section>

      <section v-if="route.segments?.length" class="mt-12" aria-labelledby="sv">
        <h2 id="sv" class="text-xl font-bold">Add a service point</h2>
        <form class="mt-4 grid gap-3 md:grid-cols-6 md:items-end" @submit.prevent="addService">
          <div class="field md:col-span-2"><label for="svs">Segment</label><select id="svs" v-model="svc.segment" class="input"><option value="" disabled>Choose</option><option v-for="s in route.segments" :key="s.id" :value="s.id">{{ s.position }}. {{ s.start_name }} to {{ s.end_name }}</option></select></div>
          <div class="field"><label for="svk">Kind</label><select id="svk" v-model="svc.kind" class="input"><option v-for="k in ['fuel', 'mechanic', 'medical', 'lodging', 'food', 'atm', 'connectivity']" :key="k" :value="k">{{ k }}</option></select></div>
          <div class="field md:col-span-2"><label for="svn">Name</label><input id="svn" v-model="svc.name" class="input" /></div>
          <div class="field"><label for="svst">Status</label><select id="svst" v-model="svc.status" class="input"><option value="draft">Draft</option><option value="published">Published</option></select></div>
          <div class="field"><label for="svc">Last confirmed</label><input id="svc" v-model="svc.last_confirmed_on" type="date" class="input" /></div>
          <div class="field md:col-span-4"><label for="svno">Notes</label><input id="svno" v-model="svc.notes" class="input" /></div>
          <button type="submit" class="btn btn-quiet" :disabled="!svc.segment || svc.name.length < 2">Add</button>
        </form>
      </section>
    </template>
  </div>
</template>
