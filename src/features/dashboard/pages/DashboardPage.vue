<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import StatusLine from '@/components/ui/StatusLine.vue'
import { errorMessage } from '@/lib/api/client'
import { getOverview } from '../services/overview'

const counts = ref<{ label: string; value: number; hint: string; to?: string }[]>([])
const error = ref<string | null>(null)
const loading = ref(true)

async function load() {
  loading.value = true
  error.value = null
  try {
    const d = await getOverview()
    counts.value = [
      { label: 'Verification requests waiting', value: d.verifications_pending ?? 0, hint: 'Organizer, trip contributor and expert claims', to: '/verification' },
      { label: 'Contributions waiting for review', value: d.contributions_pending ?? 0, hint: 'Road reports and rider experiences', to: '/moderation' },
      { label: 'Flagged contributions', value: d.contributions_flagged ?? 0, hint: 'Reported by riders or staff', to: '/moderation?status=flagged' },
      { label: 'Published destinations', value: d.destinations_published ?? 0, hint: `${d.destinations_draft ?? 0} drafts`, to: '/destinations' },
      { label: 'Published routes', value: d.routes_published ?? 0, hint: 'Visible to everyone', to: '/routes' },
      { label: 'Upcoming events', value: d.events_upcoming ?? 0, hint: 'Open, full or postponed', to: '/events' },
    ]
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Overview</h1>
    <p class="mt-2 text-sm text-muted">Live counts from the database.</p>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Counts could not be loaded.</StatusLine>
    <dl v-else class="mt-8 grid border-t border-line sm:grid-cols-3">
      <div v-for="c in counts" :key="c.label" class="border-b border-line py-5 sm:pr-6">
        <dt class="text-sm font-semibold"><RouterLink v-if="c.to" :to="c.to" class="link">{{ c.label }}</RouterLink><template v-else>{{ c.label }}</template></dt>
        <dd class="display tabular mt-2 text-5xl">{{ c.value }}</dd>
        <dd class="mt-1 text-xs text-muted">{{ c.hint }}</dd>
      </div>
    </dl>
  </div>
</template>
