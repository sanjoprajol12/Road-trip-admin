<script setup lang="ts">
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('security')
const { values, errors } = s
</script>

<template>
  <SettingsForm title="Security" intro="Limits for staff sessions and sign-in attempts. Changes apply to the next request; staff two-step sign-in is an open owner decision (AR3) and is not available here." :state="s" save-label="Save security settings">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="field"><label for="se-idle">Staff idle limit (minutes)</label><input id="se-idle" v-model.number="values.staff_idle_minutes" type="number" min="15" max="240" class="input" /><p v-if="errors.staff_idle_minutes" class="field-error">{{ errors.staff_idle_minutes }}</p></div>
      <div class="field"><label for="se-max">Staff session maximum (hours)</label><input id="se-max" v-model.number="values.staff_max_hours" type="number" min="1" max="24" class="input" /><p v-if="errors.staff_max_hours" class="field-error">{{ errors.staff_max_hours }}</p></div>
      <div class="field"><label for="se-login">Sign-in attempts per minute</label><input id="se-login" v-model.number="values.login_attempts_per_minute" type="number" min="3" max="20" class="input" /><p class="field-hint">Per email address and network address, riders and staff.</p><p v-if="errors.login_attempts_per_minute" class="field-error">{{ errors.login_attempts_per_minute }}</p></div>
    </div>
  </SettingsForm>
</template>
