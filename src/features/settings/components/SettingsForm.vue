<script setup lang="ts">
import StatusLine from '@/components/ui/StatusLine.vue'
import type { useSettingsGroup } from '../composables/useSettingsGroup'

// The frame every settings page uses: a labelled region, its intro, the fields (slot) and one save button.
defineProps<{ title: string; intro: string; state: ReturnType<typeof useSettingsGroup>; saveLabel?: string }>()
</script>

<template>
  <section class="max-w-2xl" :aria-labelledby="`s-${title}`">
    <h2 :id="`s-${title}`" class="text-xl font-semibold">{{ title }}</h2>
    <p class="mt-1 text-sm text-muted">{{ intro }}</p>
    <StatusLine v-if="state.loading.value" state="loading" />
    <StatusLine v-else-if="state.loadError.value" state="error" :message="state.loadError.value">These settings could not be loaded.</StatusLine>
    <form v-else class="mt-4 grid gap-4" novalidate @submit.prevent="state.save">
      <p v-if="state.errors.value._" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">{{ state.errors.value._ }}</p>
      <slot :values="state.values" :errors="state.errors.value" />
      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" class="btn btn-primary" :disabled="state.saving.value" :aria-busy="state.saving.value">{{ saveLabel ?? `Save ${title.toLowerCase()}` }}</button>
        <span v-if="state.saved.value" class="text-sm text-success" role="status">{{ state.saved.value }}</span>
        <slot name="actions" />
      </div>
      <slot name="after" />
    </form>
  </section>
</template>
