<script setup lang="ts">
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('footer')
const { values, errors } = s
</script>

<template>
  <SettingsForm title="Footer" intro="Text in the website footer. The emergency disclaimer is required: the website is not an emergency service." :state="s">
    <div class="field"><label for="f-tag">Tagline</label><input id="f-tag" v-model="values.tagline" class="input" maxlength="160" /></div>
    <div class="field"><label for="f-dis">Emergency disclaimer</label><textarea id="f-dis" v-model="values.disclaimer as string" class="input" rows="2" maxlength="400" :aria-invalid="!!errors.disclaimer" /><p v-if="errors.disclaimer" class="field-error">{{ errors.disclaimer }}</p></div>
    <div class="field"><label for="f-note">Note</label><textarea id="f-note" v-model="values.note as string" class="input" rows="2" maxlength="300" /></div>
    <div class="field"><label for="f-cred">Photo credits</label><textarea id="f-cred" v-model="values.credits as string" class="input" rows="2" maxlength="300" /></div>
  </SettingsForm>
</template>
