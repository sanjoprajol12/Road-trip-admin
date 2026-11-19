<script setup lang="ts">
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import type { usePasswordConfirm } from '@/lib/usePasswordConfirm'

// The one dialog every privileged action uses when the API answers 423 (fresh password needed).
const props = defineProps<{ pw: ReturnType<typeof usePasswordConfirm>; reason?: string }>()
const password = props.pw.password // the composable's own ref: typing into it is not a prop mutation
</script>

<template>
  <ConfirmDialog :open="pw.asking.value" title="Confirm your password" confirm-label="Confirm" @confirm="pw.confirm" @cancel="pw.cancel">
    <div class="grid gap-2 text-ink">
      <p class="text-muted">{{ reason ?? 'This change needs your staff password again.' }}</p>
      <label for="cpw" class="text-sm font-semibold">Password</label>
      <input id="cpw" v-model="password" type="password" class="input" autocomplete="current-password" @keydown.enter.prevent="pw.confirm" />
      <p v-if="pw.error.value" class="field-error" role="alert">{{ pw.error.value }}</p>
    </div>
  </ConfirmDialog>
</template>
