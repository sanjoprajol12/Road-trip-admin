<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage } from '@/lib/api/client'
import type { Contribution } from '@/types/api'
import ModerationItem from '../components/ModerationItem.vue'
import { statusLabels } from '../labels'
import { listForModeration } from '../services/moderation'

const filters: Record<string, string> = { ...statusLabels, corrections: 'Corrections to review', all: 'All' }
const route = useRoute()
const router = useRouter()
const status = ref(String(route.query.status ?? 'pending_review'))
const items = ref<Contribution[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = await listForModeration(status.value)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(status, () => {
  items.value = []
  void router.replace({ query: { status: status.value } })
  void load()
}, { immediate: true })
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Moderation</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Decide whether rider contributions are published. You set a status and a note; you never edit what the rider wrote. Publication means "passed review", not "proven true". Items reported as dangerous come first.</p>
    <div class="mt-6 field"><label for="ms">Show</label><select id="ms" v-model="status" class="input w-56"><option v-for="(l, s) in filters" :key="s" :value="s">{{ l }}</option></select></div>
    <!-- Reloads after an action keep the cards (open history, messages) on screen. -->
    <StatusLine v-if="loading && !items.length" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">The queue could not be loaded.</StatusLine>
    <StatusLine v-else-if="!items.length" state="empty">Nothing here.</StatusLine>
    <ul v-else class="mt-6 grid gap-6">
      <ModerationItem v-for="c in items" :key="c.id" :item="c" @changed="load" />
    </ul>
  </div>
</template>
