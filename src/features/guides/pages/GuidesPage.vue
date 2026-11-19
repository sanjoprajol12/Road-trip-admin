<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import type { Guide } from '@/types/api'
import { listGuides, publishGuide, saveGuide } from '../services/guides'

const categories: Record<Guide['category'], string> = { preparation: 'Preparing the trip', mechanical: 'Motorcycle and repairs', medical: 'First aid', road_safety: 'Road safety', weather: 'Weather', emergency: 'If something goes wrong' }
const safety = new Set(['mechanical', 'medical', 'road_safety', 'emergency'])
const list = ref<Guide[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const msg = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    list.value = await listGuides()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
const blank = { id: '', slug: '', title: '', category: 'preparation' as Guide['category'], body: '', sources: '' }
const form = reactive({ ...blank })
const editing = ref(false)
const errors = ref<Record<string, string>>({})
function edit(g?: Guide) {
  Object.assign(form, blank, g ? { id: g.id, slug: g.slug, title: g.title, category: g.category, body: g.body, sources: g.sources } : {})
  errors.value = {}
  editing.value = true
}
async function save() {
  errors.value = {}
  const { id, ...body } = form
  try {
    await saveGuide(id ?? null, body)
    editing.value = false
    msg.value = safety.has(form.category) ? 'Saved. A verified expert in this field must review it before it can be published.' : 'Saved.'
    await load()
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) msg.value = errorMessage(e)
  }
}
async function publish(g: Guide) {
  try {
    await publishGuide(g.id)
    msg.value = `${g.title} is published.`
    await load()
  } catch (e) {
    msg.value = errorMessage(e)
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div><h1 class="display text-4xl">Guides</h1><p class="mt-2 max-w-2xl text-sm text-muted">Preparation and safety guidance with sources. Mechanical, medical, road-safety and emergency guides publish only after a verified expert in that field has reviewed the exact text; editing the text clears the review.</p></div>
      <button type="button" class="btn btn-primary" @click="edit()">New guide</button>
    </div>
    <p v-if="msg" class="mt-4 text-sm" role="status">{{ msg }}</p>
    <form v-if="editing" class="mt-6 grid gap-4 rounded-md border border-line bg-surface p-5 md:grid-cols-3" novalidate @submit.prevent="save">
      <div class="field"><label for="g-t">Title</label><input id="g-t" v-model="form.title" class="input" /><p v-if="errors.title" class="field-error">{{ errors.title }}</p></div>
      <div class="field"><label for="g-s">Address (slug)</label><input id="g-s" v-model="form.slug" class="input" /><p v-if="errors.slug" class="field-error">{{ errors.slug }}</p></div>
      <div class="field"><label for="g-c">Category</label><select id="g-c" v-model="form.category" class="input"><option v-for="(l, c) in categories" :key="c" :value="c">{{ l }}</option></select></div>
      <div class="field md:col-span-3"><label for="g-b">Guide text</label><textarea id="g-b" v-model="form.body" class="input" rows="10" /><p v-if="errors.body" class="field-error">{{ errors.body }}</p></div>
      <div class="field md:col-span-3"><label for="g-src">Sources</label><textarea id="g-src" v-model="form.sources" class="input" rows="3" placeholder="Where this guidance comes from" /><p v-if="errors.sources" class="field-error">{{ errors.sources }}</p></div>
      <div class="flex gap-2 md:col-span-3"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-quiet" @click="editing = false">Cancel</button></div>
    </form>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Guides could not be loaded.</StatusLine>
    <StatusLine v-else-if="!list.length" state="empty">No guides yet.</StatusLine>
    <ul v-else class="mt-6 grid border-t border-line text-sm">
      <li v-for="g in list" :key="g.id" class="flex flex-wrap items-center gap-4 border-b border-line py-3">
        <span class="flex-1"><span class="font-semibold">{{ g.title }}</span><span class="block text-xs text-muted">{{ categories[g.category] }}</span></span>
        <span class="capitalize">{{ g.status }}</span>
        <span v-if="g.needs_expert_review" :class="g.expert_reviewed ? 'text-success' : 'text-warning'">{{ g.expert_reviewed ? `Expert reviewed ${formatDay(g.expert_reviewed_at)}` : 'Needs expert review' }}</span>
        <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Edit ${g.title}`" @click="edit(g)">Edit</button>
        <button v-if="g.status !== 'published'" type="button" class="btn btn-quiet min-h-9 px-3" :disabled="g.needs_expert_review && !g.expert_reviewed" :aria-label="`Publish ${g.title}`" @click="publish(g)">Publish</button>
      </li>
    </ul>
  </div>
</template>
