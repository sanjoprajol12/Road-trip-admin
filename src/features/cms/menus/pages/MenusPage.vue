<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { getMenu, saveMenu, type MenuRow } from '../services/menus'

// Header and footer menus of the public website. Saved menus go live at once.
const location = ref<'header' | 'footer'>('header')
const items = ref<MenuRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const errors = ref<Record<string, string>>({})
const saved = ref<string | null>(null)
watch(location, async (l) => {
  loading.value = true
  error.value = null
  saved.value = null
  try {
    items.value = await getMenu(l)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}, { immediate: true })
function move(i: number, step: number) {
  const [x] = items.value.splice(i, 1)
  items.value.splice(i + step, 0, x!)
}
async function save() {
  errors.value = {}
  saved.value = null
  try {
    items.value = await saveMenu(location.value, items.value)
    saved.value = 'Menu saved. It is live on the website.'
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) errors.value = { _: errorMessage(e) }
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Menus</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Links in the website header and footer. A link goes to a page of the website (like /explore) or to an https address. Changes are in the audit log.</p>
    <div class="mt-6 flex gap-2" role="group" aria-label="Menu">
      <button v-for="l in ['header', 'footer'] as const" :key="l" type="button" class="btn min-h-9 px-3 text-sm" :class="location === l ? 'btn-primary' : 'btn-quiet'" :aria-pressed="location === l" @click="location = l">{{ l === 'header' ? 'Header' : 'Footer' }}</button>
    </div>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error">The menu could not be loaded.</StatusLine>
    <form v-else class="mt-6 grid max-w-3xl gap-3" novalidate @submit.prevent="save">
      <p v-if="errors._" class="text-sm text-danger" role="alert">{{ errors._ }}</p>
      <div v-for="(it, i) in items" :key="i" class="grid gap-2 rounded-md border border-line bg-surface p-3 sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
        <label class="grid gap-1 text-sm">Label<input v-model="it.label" class="input" maxlength="40" /></label>
        <label class="grid gap-1 text-sm">Goes to<input v-model="it.target" class="input" maxlength="300" :aria-invalid="!!errors[`items.${i}.target`]" /><span v-if="errors[`items.${i}.target`]" class="field-error">{{ errors[`items.${i}.target`] }}</span></label>
        <div class="flex gap-1">
          <button type="button" class="btn btn-quiet min-h-9 px-2" :disabled="i === 0" :aria-label="`Move ${it.label} up`" @click="move(i, -1)"><ArrowUp class="size-4" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet min-h-9 px-2" :disabled="i === items.length - 1" :aria-label="`Move ${it.label} down`" @click="move(i, 1)"><ArrowDown class="size-4" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet min-h-9 px-2" :aria-label="`Remove ${it.label}`" @click="items.splice(i, 1)"><Trash2 class="size-4" aria-hidden="true" /></button>
        </div>
        <div class="flex flex-wrap gap-4 text-sm sm:col-span-3">
          <label class="flex items-center gap-2"><input v-model="it.is_visible" type="checkbox" /> Shown</label>
          <label class="flex items-center gap-2"><input v-model="it.signed_in_only" type="checkbox" /> Only for signed-in riders</label>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button v-if="items.length < 12" type="button" class="btn btn-quiet" @click="items.push({ label: '', target: '/', signed_in_only: false, is_visible: true })"><Plus class="size-4" aria-hidden="true" /> Add link</button>
        <button type="submit" class="btn btn-primary">Save menu</button>
        <span v-if="saved" class="text-sm text-success" role="status">{{ saved }}</span>
      </div>
    </form>
  </div>
</template>
