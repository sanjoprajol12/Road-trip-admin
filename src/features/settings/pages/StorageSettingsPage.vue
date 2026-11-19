<script setup lang="ts">
import { ref } from 'vue'
import { HardDrive } from 'lucide-vue-next'
import { errorMessage } from '@/lib/api/client'
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'
import { testStorage, type StorageProbe } from '../services/settings'

const s = useSettingsGroup('storage')
const { values, errors } = s
const imageTypes = [['image/jpeg', 'JPEG'], ['image/png', 'PNG'], ['image/webp', 'WebP']] as const
const probe = ref<StorageProbe | null>(null)
const probing = ref(false)
async function test() {
  probing.value = true
  try {
    probe.value = await testStorage()
  } catch (e) {
    const data = (e as { response?: { data?: StorageProbe } }).response?.data
    probe.value = data?.disk ? data : { ok: false, disk: '?', error: errorMessage(e), usage: { library: { files: 0, bytes: 0 }, rider_photos: { files: 0, bytes: 0 } } }
  } finally {
    probing.value = false
  }
}
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
</script>

<template>
  <SettingsForm title="Storage and uploads" intro="Files are stored on the server disk until a storage provider is chosen. Limits apply to every upload." :state="s" save-label="Save storage and uploads">
    <div class="field"><label for="st-driver">Where files are stored</label><select id="st-driver" v-model="values.driver" class="input"><option value="local">Server disk (local)</option></select>
      <p class="field-hint">A durable storage provider (needed on Vercel) is an owner decision; it will appear here once chosen.</p></div>
    <div class="field"><label for="st-max">Largest upload (KB)</label><input id="st-max" v-model.number="values.max_upload_kb" type="number" min="256" max="8192" class="input sm:w-40" :aria-invalid="!!errors.max_upload_kb" /><p v-if="errors.max_upload_kb" class="field-error">{{ errors.max_upload_kb }}</p></div>
    <fieldset class="grid gap-1 text-sm"><legend class="font-semibold">Image types accepted</legend>
      <label v-for="[mime, name] in imageTypes" :key="mime" class="flex items-center gap-2"><input v-model="values.image_types" type="checkbox" :value="mime" /> {{ name }}</label>
      <p v-if="errors.image_types" class="field-error">{{ errors.image_types }}</p>
    </fieldset>
    <template #actions>
      <button type="button" class="btn btn-quiet" :disabled="probing" :aria-busy="probing" @click="test"><HardDrive class="size-4" aria-hidden="true" /> {{ probing ? 'Testing…' : 'Test storage' }}</button>
    </template>
    <template #after>
      <div v-if="probe" class="rounded-md border border-line bg-surface p-4 text-sm" :role="probe.ok ? 'status' : 'alert'">
        <p class="font-semibold" :class="probe.ok ? 'text-success' : 'text-danger'">{{ probe.ok ? `Storage works (${probe.disk}).` : probe.error }}</p>
        <p class="mt-1 text-muted">Library: {{ probe.usage.library.files }} files, {{ mb(probe.usage.library.bytes) }}. Rider photos: {{ probe.usage.rider_photos.files }} files, {{ mb(probe.usage.rider_photos.bytes) }} (older photos have no recorded size).</p>
      </div>
    </template>
  </SettingsForm>
</template>
