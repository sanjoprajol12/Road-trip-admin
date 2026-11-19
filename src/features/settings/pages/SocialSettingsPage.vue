<script setup lang="ts">
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('social')
const { values, errors } = s
const networks = [['facebook', 'Facebook'], ['instagram', 'Instagram'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['x', 'X']] as const
</script>

<template>
  <SettingsForm title="Social media" intro="Links shown in the website footer. Leave a network empty to hide it. Only https links." :state="s">
    <div v-for="[k, label] in networks" :key="k" class="field">
      <label :for="`so-${k}`">{{ label }}</label>
      <input :id="`so-${k}`" v-model="values[k]" type="url" class="input" placeholder="https://" :aria-invalid="!!errors[k]" />
      <p v-if="errors[k]" class="field-error">{{ errors[k] }}</p>
    </div>
  </SettingsForm>
</template>
