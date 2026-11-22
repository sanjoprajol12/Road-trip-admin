<script setup lang="ts">
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('general')
const { values, errors } = s
const fields = [['site_name', 'Site name', 'text'], ['tagline', 'Tagline', 'text'], ['contact_email', 'Contact email', 'email'], ['contact_phone', 'Contact phone', 'tel']] as const
</script>

<template>
  <SettingsForm title="General" intro="Name, description and contact details shown on the public website." :state="s">
    <div v-for="[k, label, type] in fields" :key="k" class="field">
      <label :for="`g-${k}`">{{ label }}</label>
      <input :id="`g-${k}`" v-model="values[k]" :type="type" class="input" :aria-invalid="!!errors[k]" />
      <p v-if="errors[k]" class="field-error">{{ errors[k] }}</p>
    </div>
    <div class="field"><label for="g-description">Description</label><textarea id="g-description" v-model="values.description as string" class="input" rows="2" maxlength="300" /><p v-if="errors.description" class="field-error">{{ errors.description }}</p></div>
    <div class="field"><label for="g-address">Address</label><textarea id="g-address" v-model="values.address as string" class="input" rows="2" maxlength="300" /></div>
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="field"><label for="g-lang">Language</label><select id="g-lang" v-model="values.default_language" class="input"><option value="en">English</option></select></div>
      <div class="field"><label for="g-tz">Timezone</label><input id="g-tz" v-model="values.timezone" class="input" :aria-invalid="!!errors.timezone" /><p v-if="errors.timezone" class="field-error">{{ errors.timezone }}</p></div>
      <div class="field"><label for="g-df">Date format</label><select id="g-df" v-model="values.date_format" class="input"><option value="day_month_year">4 Nov 2026</option><option value="month_day_year">Nov 4, 2026</option><option value="iso">2026-11-04</option></select></div>
    </div>
    <p class="text-xs text-muted">Only English content exists. Another language needs translated content first.</p>
  </SettingsForm>
</template>
