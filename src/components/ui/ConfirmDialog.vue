<script setup lang="ts">
import { ref, watch } from 'vue'

// Native <dialog>: focus moves in, Escape closes, focus returns to the opener.
const props = defineProps<{ open: boolean; title: string; confirmLabel: string; danger?: boolean; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const el = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => (open ? el.value?.showModal() : el.value?.close()),
  { flush: 'post' },
)
</script>

<template>
  <dialog
    ref="el"
    class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-md border border-line bg-surface p-6 text-ink backdrop:bg-night/50"
    aria-labelledby="confirm-title"
    @cancel.prevent="emit('cancel')"
  >
    <h2 id="confirm-title" class="text-lg font-bold">{{ title }}</h2>
    <div class="mt-2 text-sm text-muted"><slot /></div>
    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="btn btn-quiet" @click="emit('cancel')">Cancel</button>
      <button
        type="button"
        class="btn"
        :class="danger ? 'bg-danger text-surface hover:bg-crimson-deep' : 'btn-primary'"
        :disabled="busy"
        :aria-busy="busy"
        @click="emit('confirm')"
      >
        {{ busy ? 'Working…' : confirmLabel }}
      </button>
    </div>
  </dialog>
</template>
