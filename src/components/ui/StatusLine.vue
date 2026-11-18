<script setup lang="ts">
import { CircleAlert, Inbox, LoaderCircle } from 'lucide-vue-next'

defineProps<{ state: 'loading' | 'error' | 'empty'; message?: string | null }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex items-start gap-2.5 py-6 text-sm" :role="state === 'error' ? 'alert' : 'status'">
    <LoaderCircle v-if="state === 'loading'" class="mt-0.5 size-4 shrink-0 animate-spin text-muted" aria-hidden="true" />
    <CircleAlert v-else-if="state === 'error'" class="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
    <Inbox v-else class="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
    <div>
      <p :class="state === 'error' ? 'font-semibold' : 'text-muted'">
        <slot>{{ state === 'loading' ? 'Loading…' : state === 'error' ? 'Could not load this.' : 'Nothing here.' }}</slot>
      </p>
      <p v-if="message" class="text-muted">{{ message }}</p>
      <button v-if="state === 'error'" type="button" class="btn btn-quiet mt-3 min-h-9" @click="$emit('retry')">Try again</button>
    </div>
  </div>
</template>
