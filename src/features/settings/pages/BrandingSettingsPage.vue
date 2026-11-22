<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { listMedia } from '@/features/media/services/media'
import SettingsForm from '../components/SettingsForm.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'

const s = useSettingsGroup('branding')
const { values, errors } = s
const images = ref<{ id: string; alt: string }[]>([])
onMounted(async () => (images.value = await listMedia<{ id: string; alt: string }>('').catch(() => [])))
</script>

<template>
  <SettingsForm title="Branding" intro="The image link previews show when someone shares the website (from the media library: licence and credit are checked there)." :state="s">
    <div class="field"><label for="b-img">Default sharing image</label>
      <select id="b-img" v-model="values.share_image_media_id" class="input" :aria-invalid="!!errors.share_image_media_id"><option :value="null">None</option><option v-for="m in images" :key="m.id" :value="m.id">{{ m.alt }}</option></select>
      <p v-if="errors.share_image_media_id" class="field-error">{{ errors.share_image_media_id }}</p></div>
    <div class="field"><label for="b-alt">Description of that image</label><input id="b-alt" v-model="values.share_image_alt" class="input" maxlength="200" /></div>
  </SettingsForm>
</template>
