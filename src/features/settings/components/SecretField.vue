<script setup lang="ts">
// A write-only secret: shows whether one is stored, never its value. Empty input keeps the stored one.
defineProps<{ id: string; label: string; isSet: boolean; error?: string }>()
const model = defineModel<{ value: string; clear: boolean }>({ required: true })
</script>

<template>
  <div class="field">
    <label :for="id">{{ label }} <span class="font-normal text-muted">({{ isSet ? 'stored, hidden' : 'not set' }})</span></label>
    <input :id="id" v-model="model.value" type="password" class="input" autocomplete="new-password" :placeholder="isSet ? 'Leave empty to keep it' : ''" :disabled="model.clear" :aria-invalid="!!error" />
    <label v-if="isSet" class="mt-1 flex items-center gap-2 text-sm font-normal"><input v-model="model.clear" type="checkbox" /> Remove the stored value</label>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>
