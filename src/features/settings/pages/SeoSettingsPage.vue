<script setup lang="ts">
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('seo')
const { values, errors } = s
</script>

<template>
  <SettingsForm title="SEO" intro="The default title and description of the website in search results and link previews. Whether search engines see them before the page runs is decision D4 (prerendering)." :state="s">
    <div class="field"><label for="seo-t">Default title <span class="font-normal text-muted">(up to 60 characters)</span></label><input id="seo-t" v-model="values.default_title" class="input" maxlength="60" :aria-invalid="!!errors.default_title" /><p v-if="errors.default_title" class="field-error">{{ errors.default_title }}</p></div>
    <div class="field"><label for="seo-d">Default description <span class="font-normal text-muted">(up to 160 characters)</span></label><textarea id="seo-d" v-model="values.default_description as string" class="input" rows="2" maxlength="160" :aria-invalid="!!errors.default_description" /><p v-if="errors.default_description" class="field-error">{{ errors.default_description }}</p></div>
  </SettingsForm>
</template>
