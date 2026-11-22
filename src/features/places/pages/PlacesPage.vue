<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import { useStaff } from '@/features/authentication/staffAccess'
import PlaceEditor from '../components/PlaceEditor.vue'
import CorrectionsQueue from '../components/CorrectionsQueue.vue'
import SuggestionsQueue from '../components/SuggestionsQueue.vue'
import { listPlaces, placeCategories, placeStatuses, type PlaceRow } from '../services/places'

// Places of interest: staff entries and rider suggestions (waiting ones first), plus the corrections queue.
const { can } = useStaff()
// Tabs follow permissions: managing places (places.manage) and reviewing rider input (places.review) are separate.
const tab = ref<'places' | 'suggestions' | 'corrections'>(can('places.manage') ? 'places' : 'suggestions')
const filters = reactive({ q: '', category: '', status: '', page: 1 })
const items = ref<PlaceRow[]>([])
const meta = ref({ total: 0, current_page: 1, last_page: 1, pending: 0, open_corrections: 0 })
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    const r = await listPlaces({ q: filters.q || undefined, category: filters.category || undefined, status: filters.status || undefined, page: filters.page })
    items.value = r.data
    meta.value = r.meta
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
// Only staff who manage places load the full list (the API refuses others).
watch(() => [filters.category, filters.status, filters.page], () => can('places.manage') && void load(), { immediate: true })
const editing = ref<{ place: PlaceRow | null } | null>(null)
function saved(p: PlaceRow) {
  editing.value = { place: p }
  void load()
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Places</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Viewpoints, lakes, temples and other places of interest, including rider suggestions. Only published places are public. Never add details you have not checked.</p>
    <p v-if="!can('places.manage')" class="mt-2 max-w-2xl text-sm text-muted">You review rider suggestions and corrections. Creating, editing and publishing official places is done by staff with place management rights.</p>
    <nav class="mt-6 flex flex-wrap gap-2" aria-label="Places sections">
      <button v-if="can('places.manage')" type="button" class="btn min-h-9 px-3 text-sm" :class="tab === 'places' ? 'btn-primary' : 'btn-quiet'" :aria-pressed="tab === 'places'" @click="tab = 'places'">Places<template v-if="meta.pending"> ({{ meta.pending }} waiting)</template></button>
      <button v-if="can('places.review')" type="button" class="btn min-h-9 px-3 text-sm" :class="tab === 'suggestions' ? 'btn-primary' : 'btn-quiet'" :aria-pressed="tab === 'suggestions'" @click="tab = 'suggestions'">Rider suggestions</button>
      <button v-if="can('places.review')" type="button" class="btn min-h-9 px-3 text-sm" :class="tab === 'corrections' ? 'btn-primary' : 'btn-quiet'" :aria-pressed="tab === 'corrections'" @click="tab = 'corrections'">Corrections<template v-if="meta.open_corrections"> ({{ meta.open_corrections }})</template></button>
    </nav>

    <CorrectionsQueue v-if="tab === 'corrections'" />
    <SuggestionsQueue v-else-if="tab === 'suggestions'" />
    <template v-else-if="can('places.manage')">
      <div class="mt-6 flex flex-wrap items-end gap-3">
        <form class="flex items-end gap-2" role="search" @submit.prevent="(filters.page = 1), load()">
          <div class="field"><label for="pl-q">Search places</label><input id="pl-q" v-model="filters.q" type="search" class="input w-64" /></div>
          <button type="submit" class="btn btn-quiet" aria-label="Search"><Search class="size-4" aria-hidden="true" /></button>
        </form>
        <div class="field"><label for="pl-fc">Filter by category</label><select id="pl-fc" v-model="filters.category" class="input w-44"><option value="">Any</option><option v-for="(l, k) in placeCategories" :key="k" :value="k">{{ l }}</option></select></div>
        <div class="field"><label for="pl-fs">Filter by status</label><select id="pl-fs" v-model="filters.status" class="input w-48"><option value="">Any</option><option v-for="(l, k) in placeStatuses" :key="k" :value="k">{{ l }}</option></select></div>
        <button type="button" class="btn btn-primary ml-auto" @click="editing = { place: null }"><Plus class="size-4" aria-hidden="true" /> New place</button>
      </div>

      <PlaceEditor v-if="editing" :key="`${editing.place?.id ?? 'new'}-${editing.place?.status ?? ''}`" :place="editing.place" @saved="saved" @close="editing = null" />

      <StatusLine v-if="loading && !items.length" state="loading" />
      <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Places could not be loaded.</StatusLine>
      <StatusLine v-else-if="!items.length" state="empty">No places match.</StatusLine>
      <div v-else class="relative mt-6 overflow-x-auto">
        <table class="w-full min-w-[44rem] border-collapse text-left text-sm">
          <caption class="sr-only">Places</caption>
          <thead><tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase"><th scope="col" class="py-2 pr-4">Name</th><th scope="col" class="py-2 pr-4">Category</th><th scope="col" class="py-2 pr-4">Status</th><th scope="col" class="py-2 pr-4">Updated</th><th scope="col" class="py-2"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>
            <tr v-for="p in items" :key="p.id" class="border-b border-line align-top">
              <td class="py-3 pr-4 font-semibold">{{ p.name }}<span class="block text-xs font-normal text-muted">{{ p.submitted_by_name ? `Suggested by ${p.submitted_by_name}` : 'Staff entry' }}<template v-if="p.open_corrections"> · {{ p.open_corrections }} corrections</template></span></td>
              <td class="py-3 pr-4">{{ placeCategories[p.category] }}</td>
              <td class="py-3 pr-4">{{ placeStatuses[p.status] }}</td>
              <td class="tabular py-3 pr-4 text-xs">{{ formatDayTime(p.updated_at) }}</td>
              <td class="py-3 text-right"><button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Open ${p.name}`" @click="editing = { place: p }">Open</button></td>
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
  </div>
</template>
