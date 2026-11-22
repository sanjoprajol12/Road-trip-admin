<script setup lang="ts">
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('trust')
const { values, errors } = s
</script>

<template>
  <SettingsForm title="Trust" intro="When enough different riders say a published report is still accurate, it is labelled &quot;corroborated by other riders&quot;. Riders count only with a confirmed email, an active account and contribution rights, and never for their own report. Corroboration is not official verification." :state="s" save-label="Save trust settings">
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="field"><label for="tr-n">Riders needed (default 3)</label><input id="tr-n" v-model.number="values.corroboration_threshold" type="number" min="2" max="20" class="input" /><p v-if="errors.corroboration_threshold" class="field-error">{{ errors.corroboration_threshold }}</p></div>
      <div class="field"><label for="tr-d">Within the last (days)</label><input id="tr-d" v-model.number="values.corroboration_window_days" type="number" min="7" max="365" class="input" /><p v-if="errors.corroboration_window_days" class="field-error">{{ errors.corroboration_window_days }}</p></div>
    </div>
  </SettingsForm>
</template>
