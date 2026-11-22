<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-vue-next'
import { listMedia } from '@/features/media/services/media'
import { listEntries, type CmsEntry, type CmsType } from '../services/content'

// The type-specific part of the entry form, built from the field descriptors in config/cms.php.
const props = defineProps<{ type: CmsType; errors: Record<string, string> }>()
const data = defineModel<Record<string, unknown>>('data', { required: true })
const media = defineModel<string | null>('media', { required: true })

const options = ref<Record<string, CmsEntry[]>>({})
const assets = ref<{ id: string; url: string; alt: string }[]>([])
onMounted(async () => {
  for (const f of props.type.fields) if ((f.kind === 'ref' || f.kind === 'refs') && f.ref) options.value[f.ref] = (await listEntries(f.ref)).data
  if (props.type.core.includes('media')) assets.value = await listMedia<{ id: string; url: string; alt: string }>('')
})
const link = (k: string) => ((data.value[k] ??= { label: '', to: '' }) as { label: string; to: string })
const list = (k: string) => ((data.value[k] ??= []) as string[])
const blocks = (k: string) => ((data.value[k] ??= []) as { kind: string; text: string }[])
function move<T>(arr: T[], i: number, d: number) {
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
}
const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.splice(arr.indexOf(id), 1) : arr.push(id))
const err = (k: string) => props.errors[`data.${k}`]
</script>

<template>
  <div v-if="type.core.includes('media')" class="field">
    <label for="e-media">Image (from the media library)</label>
    <select id="e-media" v-model="media" class="input"><option :value="null">No image</option><option v-for="a in assets" :key="a.id" :value="a.id">{{ a.alt }}</option></select>
    <img v-if="media" :src="assets.find((a) => a.id === media)?.url" alt="" class="mt-2 h-24 w-auto rounded object-cover" />
    <p v-if="errors.media_asset_id" class="field-error">{{ errors.media_asset_id }}</p>
  </div>
  <template v-for="f in type.fields" :key="f.key">
    <div v-if="f.kind === 'text' || f.kind === 'number'" class="field"><label :for="`f-${f.key}`">{{ f.label }}</label><input :id="`f-${f.key}`" v-model="data[f.key]" :type="f.kind === 'number' ? 'number' : 'text'" class="input" :maxlength="f.max" /><p v-if="err(f.key)" class="field-error">{{ err(f.key) }}</p></div>
    <div v-else-if="f.kind === 'textarea'" class="field"><label :for="`f-${f.key}`">{{ f.label }}</label><textarea :id="`f-${f.key}`" v-model="data[f.key] as string" class="input" rows="3" :maxlength="f.max" /><p v-if="err(f.key)" class="field-error">{{ err(f.key) }}</p></div>
    <div v-else-if="f.kind === 'select'" class="field"><label :for="`f-${f.key}`">{{ f.label }}</label><select :id="`f-${f.key}`" v-model="data[f.key]" class="input"><option :value="undefined" disabled>Choose</option><option v-for="(l, v) in f.options" :key="v" :value="v">{{ l }}</option></select><p v-if="err(f.key)" class="field-error">{{ err(f.key) }}</p></div>
    <div v-else-if="f.kind === 'ref'" class="field"><label :for="`f-${f.key}`">{{ f.label }}</label><select :id="`f-${f.key}`" v-model="data[f.key]" class="input"><option :value="null">None</option><option v-for="o in options[f.ref!] ?? []" :key="o.id" :value="o.id">{{ o.title }}{{ o.status !== 'published' ? ` (${o.status})` : '' }}</option></select><p v-if="err(f.key)" class="field-error">{{ err(f.key) }}</p></div>
    <fieldset v-else-if="f.kind === 'refs'" class="grid gap-1"><legend class="text-sm font-semibold">{{ f.label }}</legend>
      <label v-for="o in options[f.ref!] ?? []" :key="o.id" class="flex items-center gap-2 text-sm"><input type="checkbox" :checked="list(f.key).includes(o.id)" @change="toggle(list(f.key), o.id)" /> {{ o.title }}</label>
      <p v-if="!(options[f.ref!] ?? []).length" class="text-sm text-muted">None created yet.</p>
    </fieldset>
    <fieldset v-else-if="f.kind === 'link'" class="grid gap-3 sm:grid-cols-2"><legend class="mb-1 text-sm font-semibold">{{ f.label }} (optional)</legend>
      <div class="field"><label :for="`f-${f.key}-l`">Button text</label><input :id="`f-${f.key}-l`" v-model="link(f.key).label" class="input" maxlength="30" /><p v-if="err(`${f.key}.label`)" class="field-error">{{ err(`${f.key}.label`) }}</p></div>
      <div class="field"><label :for="`f-${f.key}-t`">Goes to</label><input :id="`f-${f.key}-t`" v-model="link(f.key).to" class="input" maxlength="300" placeholder="/blog" /><p v-if="err(`${f.key}.to`)" class="field-error">{{ err(`${f.key}.to`) }}</p></div>
    </fieldset>
    <fieldset v-else-if="f.kind === 'blocks'" class="grid gap-2"><legend class="text-sm font-semibold">{{ f.label }}</legend>
      <div v-for="(b, i) in blocks(f.key)" :key="i" class="grid gap-2 rounded-md border border-line p-3 sm:grid-cols-[10rem_1fr_auto]">
        <div class="field"><label :for="`b-${i}-k`">Block {{ i + 1 }}</label><select :id="`b-${i}-k`" v-model="b.kind" class="input"><option value="heading">Heading</option><option value="text">Paragraphs</option><option value="callout">Highlighted note</option></select></div>
        <div class="field"><label :for="`b-${i}-t`">Text</label><textarea :id="`b-${i}-t`" v-model="b.text" class="input" :rows="b.kind === 'heading' ? 1 : 4" maxlength="5000" /><p v-if="err(`${f.key}.${i}.text`)" class="field-error">{{ err(`${f.key}.${i}.text`) }}</p></div>
        <div class="flex items-end gap-1">
          <button type="button" class="btn btn-quiet min-h-9 px-2" :aria-label="`Move block ${i + 1} up`" @click="move(blocks(f.key), i, -1)"><ArrowUp class="size-4" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet min-h-9 px-2" :aria-label="`Move block ${i + 1} down`" @click="move(blocks(f.key), i, 1)"><ArrowDown class="size-4" aria-hidden="true" /></button>
          <button type="button" class="btn btn-quiet min-h-9 px-2" :aria-label="`Remove block ${i + 1}`" @click="blocks(f.key).splice(i, 1)"><Trash2 class="size-4" aria-hidden="true" /></button>
        </div>
      </div>
      <button type="button" class="btn btn-quiet justify-self-start" @click="blocks(f.key).push({ kind: 'text', text: '' })"><Plus class="size-4" aria-hidden="true" /> Add block</button>
    </fieldset>
  </template>
</template>
