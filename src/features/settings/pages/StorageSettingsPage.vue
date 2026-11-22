<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { HardDrive } from 'lucide-vue-next'
import { errorMessage } from '@/lib/api/client'
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'
import { getUploadStatus, testStorage, type StorageProbe, type UploadStatus } from '../services/settings'

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
// The effective state: the switch, this setting, and whether the disk is durable in this environment.
const status = ref<UploadStatus | null>(null)
const loadStatus = async () => (status.value = await getUploadStatus().catch(() => null))
onMounted(loadStatus)
watch(s.saved, (v) => v && loadStatus())
const reasons: Record<string, string> = {
  disabled_by_environment: 'Turned off by the server configuration (UPLOADS_ENABLED=false). This setting cannot turn them back on.',
  disabled_by_setting: 'Paused by the setting below.',
  storage_not_configured: 'The chosen storage is not configured on the server.',
  storage_not_persistent: 'The server disk is used only in development and testing. A durable storage provider is needed here (owner decision).',
}
</script>

<template>
  <SettingsForm title="Storage and uploads" intro="Files are stored on the server disk until a storage provider is chosen. Limits apply to every upload." :state="s" save-label="Save storage and uploads">
    <div class="field"><label for="st-driver">Where files are stored</label><select id="st-driver" v-model="values.driver" class="input"><option value="local">Server disk (local)</option></select>
      <p class="field-hint">The server disk is accepted only in development and testing. Production needs a durable storage provider (owner decision, still open); it will appear here once chosen.</p></div>
    <div v-if="status" class="rounded-md border border-line bg-surface p-4 text-sm" :role="status.allowed ? 'status' : 'alert'" data-testid="upload-status">
      <p class="font-semibold" :class="status.allowed ? 'text-success' : 'text-danger'">{{ status.allowed ? 'New uploads are accepted.' : 'New uploads are paused.' }}</p>
      <p v-if="status.reason" class="mt-1">{{ reasons[status.reason] ?? status.reason }}</p>
      <p class="mt-1 text-muted">Disk: {{ status.disk }}<template v-if="status.driver"> ({{ status.driver }})</template> · environment: {{ status.environment }}. Existing images stay viewable either way.</p>
    </div>
    <label class="flex items-center gap-2 text-sm"><input v-model="values.uploads_enabled as boolean" type="checkbox" /> Accept new uploads</label>
    <div class="field"><label for="st-paused">Message shown while uploads are paused</label><textarea id="st-paused" v-model="values.uploads_paused_message as string" class="input" rows="2" maxlength="200" :aria-invalid="!!errors.uploads_paused_message" /><p v-if="errors.uploads_paused_message" class="field-error">{{ errors.uploads_paused_message }}</p></div>
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
