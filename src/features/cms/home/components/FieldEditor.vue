<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-vue-next'
import type { Field } from '../types'

// One section field. `model` is the section's data object (or one item of a list); fields edit it in place.
const props = defineProps<{ field: Field; model: Record<string, unknown>; errors: Record<string, string>; path: string; options: Record<string, { id: string; label: string }[]>; bundled: string[] }>()
// The section data (or list item) being edited, shared with the parent on purpose: the dialog saves it as one draft.
const data = computed(() => props.model)
const key = () => `${props.path}${props.field.key}`
const id = (k = '') => `f-${key()}${k}`.replaceAll('.', '-')
const list = () => (data.value[props.field.key] ??= []) as unknown[]
function move(i: number, step: number) {
  const l = list()
  const [x] = l.splice(i, 1)
  l.splice(i + step, 0, x)
}
function addItem(f: Extract<Field, { kind: 'items' }>) {
  list().push(Object.fromEntries(f.fields.map((x) => [x.key, x.kind === 'link' ? null : x.kind === 'lines' || x.kind === 'pick' ? [] : null])))
}
const link = () => (data.value[props.field.key] ??= { label: '', to: '' }) as { label: string; to: string }
function clearLink() {
  data.value[props.field.key] = null
}
const err = (k = '') => props.errors[`data.${key()}${k}`] ?? props.errors[`${key()}${k}`]
</script>

<template>
  <div class="field">
    <template v-if="field.kind === 'text' || field.kind === 'textarea'">
      <label :for="id()">{{ field.label }}<span v-if="field.optional" class="font-normal text-muted"> (optional)</span></label>
      <textarea v-if="field.kind === 'textarea'" :id="id()" v-model="data[field.key] as string" class="input" rows="3" :maxlength="field.max" :aria-invalid="!!err()" />
      <input v-else :id="id()" v-model="data[field.key] as string" class="input" :maxlength="field.max" :aria-invalid="!!err()" />
    </template>

    <fieldset v-else-if="field.kind === 'lines'" class="grid gap-2">
      <legend class="text-sm font-semibold">{{ field.label }} (up to {{ field.maxItems }})</legend>
      <div v-for="(_, i) in list()" :key="i" class="flex gap-2">
        <input v-model="(list() as string[])[i]" class="input flex-1" :maxlength="field.max" :aria-label="`${field.label} ${i + 1}`" />
        <button type="button" class="btn btn-quiet min-h-9 px-2" :aria-label="`Remove line ${i + 1}`" @click="list().splice(i, 1)"><Trash2 class="size-4" aria-hidden="true" /></button>
      </div>
      <button v-if="list().length < field.maxItems" type="button" class="btn btn-quiet min-h-9 justify-self-start px-3 text-sm" @click="list().push('')"><Plus class="size-4" aria-hidden="true" /> Add line</button>
    </fieldset>

    <fieldset v-else-if="field.kind === 'link'" class="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
      <legend class="text-sm font-semibold">{{ field.label }} <span class="font-normal text-muted">(optional; a page like /explore or an https link)</span></legend>
      <template v-if="data[field.key]">
        <label class="grid gap-1 text-sm">Text<input v-model="link().label" class="input" maxlength="30" /></label>
        <label class="grid gap-1 text-sm">Goes to<input v-model="link().to" class="input" maxlength="300" placeholder="/explore" :aria-invalid="!!err('.to')" /></label>
        <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" @click="clearLink">No button</button>
      </template>
      <button v-else type="button" class="btn btn-quiet min-h-9 justify-self-start px-3 text-sm" @click="link()"><Plus class="size-4" aria-hidden="true" /> Add button</button>
    </fieldset>

    <fieldset v-else-if="field.kind === 'background'" class="grid gap-2">
      <legend class="text-sm font-semibold">{{ field.label }}</legend>
      <select :id="id()" class="input" :value="JSON.stringify(data[field.key])" @change="data[field.key] = JSON.parse(($event.target as HTMLSelectElement).value)">
        <option v-for="b in bundled" :key="b" :value="JSON.stringify({ kind: 'bundled', ref: b })">Website photo: {{ b.split('/').pop() }}</option>
        <option v-for="m in options.media ?? []" :key="m.id" :value="JSON.stringify({ kind: 'media', ref: m.id })">Library: {{ m.label }}</option>
      </select>
    </fieldset>

    <template v-else-if="field.kind === 'media'">
      <label :for="id()">{{ field.label }}<span v-if="field.optional" class="font-normal text-muted"> (optional)</span></label>
      <select :id="id()" v-model="data[field.key]" class="input" :aria-invalid="!!err()">
        <option :value="null">{{ field.optional ? 'No image' : 'Choose an image' }}</option>
        <option v-for="m in options.media ?? []" :key="m.id" :value="m.id">{{ m.label }}</option>
      </select>
      <p class="field-hint">Images come from the media library (licence and credit checked there).</p>
    </template>

    <fieldset v-else-if="field.kind === 'pick'" class="grid gap-1">
      <legend class="text-sm font-semibold">{{ field.label }}</legend>
      <label v-for="o in options[field.source] ?? []" :key="o.id" class="flex items-center gap-2 text-sm">
        <input v-model="data[field.key]" type="checkbox" :value="o.id" :disabled="!(data[field.key] as string[]).includes(o.id) && (data[field.key] as string[]).length >= field.maxItems" /> {{ o.label }}
      </label>
      <p class="field-hint">Shown in the order you tick them. Items that are unpublished later disappear from the page on their own.</p>
    </fieldset>

    <fieldset v-else-if="field.kind === 'items'" class="grid gap-3">
      <legend class="text-sm font-semibold">{{ field.label }} (up to {{ field.maxItems }})</legend>
      <div v-for="(item, i) in list() as Record<string, unknown>[]" :key="i" class="grid gap-3 rounded-md border border-line p-3">
        <div class="flex items-center justify-between text-xs text-muted">
          <span>{{ i + 1 }}</span>
          <span class="flex gap-1">
            <button type="button" class="btn btn-quiet min-h-8 px-2" :disabled="i === 0" :aria-label="`Move item ${i + 1} up`" @click="move(i, -1)"><ArrowUp class="size-4" aria-hidden="true" /></button>
            <button type="button" class="btn btn-quiet min-h-8 px-2" :disabled="i === list().length - 1" :aria-label="`Move item ${i + 1} down`" @click="move(i, 1)"><ArrowDown class="size-4" aria-hidden="true" /></button>
            <button type="button" class="btn btn-quiet min-h-8 px-2" :aria-label="`Remove item ${i + 1}`" @click="list().splice(i, 1)"><Trash2 class="size-4" aria-hidden="true" /></button>
          </span>
        </div>
        <FieldEditor v-for="f in field.fields" :key="f.key" :field="f" :model="item" :errors="errors" :path="`${path}${field.key}.${i}.`" :options="options" :bundled="bundled" />
      </div>
      <button v-if="list().length < field.maxItems" type="button" class="btn btn-quiet min-h-9 justify-self-start px-3 text-sm" @click="addItem(field)"><Plus class="size-4" aria-hidden="true" /> Add</button>
    </fieldset>

    <p v-if="err()" class="field-error">{{ err() }}</p>
  </div>
</template>
