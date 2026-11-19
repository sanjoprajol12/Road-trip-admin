<script setup lang="ts">
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('registration')
const { values, errors } = s
</script>

<template>
  <SettingsForm title="Registration" intro="Close public rider sign-up for a while. Staff invitations and existing accounts are not affected." :state="s">
    <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="values.open" type="checkbox" /> Public sign-up is open</label>
    <div class="field"><label for="r-msg">Message while closed</label><textarea id="r-msg" v-model="values.closed_message as string" class="input" rows="2" maxlength="300" :aria-invalid="!!errors.closed_message" /><p v-if="errors.closed_message" class="field-error">{{ errors.closed_message }}</p></div>
  </SettingsForm>
</template>
