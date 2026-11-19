<script setup lang="ts">
import { ref } from 'vue'
import { errorMessage } from '@/lib/api/client'
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'
import { previewLink } from '../services/settings'

const s = useSettingsGroup('maintenance')
const { values, errors } = s
// A signed 30-minute link that shows the public website through maintenance mode (nothing else).
const previewError = ref<string | null>(null)
async function preview() {
  previewError.value = null
  try {
    window.open(await previewLink(), '_blank', 'noopener')
  } catch (e) {
    previewError.value = errorMessage(e)
  }
}
</script>

<template>
  <SettingsForm title="Maintenance" intro="While on, the public website shows only this message. Staff and sign-in keep working." :state="s">
    <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="values.enabled" type="checkbox" /> Maintenance mode is on</label>
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <button type="button" class="btn btn-quiet" @click="preview">Preview the closed website</button>
      <span class="text-muted">Opens a 30-minute staff preview link in a new tab.</span>
      <span v-if="previewError" class="text-danger" role="alert">{{ previewError }}</span>
    </div>
    <div class="field"><label for="m-msg">Message for visitors</label><textarea id="m-msg" v-model="values.message as string" class="input" rows="2" maxlength="300" :aria-invalid="!!errors.message" /><p v-if="errors.message" class="field-error">{{ errors.message }}</p></div>
  </SettingsForm>
</template>
