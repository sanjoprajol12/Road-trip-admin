<script setup lang="ts">
import { Plus, Trash2 } from 'lucide-vue-next'
import type { Source } from '@/types/api'

// Citations for an editorial record: title, publisher, link, date accessed. Saved with the record; the server validates.
const sources = defineModel<Source[]>({ required: true })
defineProps<{ errors?: Record<string, string>; idPrefix: string }>()
const add = () => sources.value.push({ title: '', publisher: null, url: null, accessed_on: null })
const remove = (i: number) => sources.value.splice(i, 1)
</script>

<template>
  <fieldset class="grid gap-3">
    <legend class="font-semibold">Sources</legend>
    <p class="text-sm text-muted">Where the facts on this record come from. Shown publicly under the record.</p>
    <div v-for="(s, i) in sources" :key="s.id ?? `new-${i}`" class="grid gap-3 rounded-md border border-line p-3 md:grid-cols-[2fr_1.5fr_2fr_10rem_auto] md:items-end">
      <div class="field"><label :for="`${idPrefix}-t-${i}`">Title</label><input :id="`${idPrefix}-t-${i}`" v-model="s.title" class="input" maxlength="200" /><p v-if="errors?.[`sources.${i}.title`]" class="field-error">{{ errors[`sources.${i}.title`] }}</p></div>
      <div class="field"><label :for="`${idPrefix}-p-${i}`">Publisher</label><input :id="`${idPrefix}-p-${i}`" v-model="s.publisher" class="input" maxlength="200" /></div>
      <div class="field"><label :for="`${idPrefix}-u-${i}`">Link</label><input :id="`${idPrefix}-u-${i}`" v-model="s.url" type="url" class="input" /><p v-if="errors?.[`sources.${i}.url`]" class="field-error">{{ errors[`sources.${i}.url`] }}</p></div>
      <div class="field"><label :for="`${idPrefix}-a-${i}`">Accessed</label><input :id="`${idPrefix}-a-${i}`" v-model="s.accessed_on" type="date" class="input" /><p v-if="errors?.[`sources.${i}.accessed_on`]" class="field-error">{{ errors[`sources.${i}.accessed_on`] }}</p></div>
      <button type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Remove source ${i + 1}`" @click="remove(i)"><Trash2 class="size-4" aria-hidden="true" /></button>
    </div>
    <button type="button" class="btn btn-quiet justify-self-start" @click="add"><Plus class="size-4" aria-hidden="true" /> Add source</button>
  </fieldset>
</template>
