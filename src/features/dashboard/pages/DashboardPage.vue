<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { CircleAlert, LoaderCircle } from 'lucide-vue-next'
import { db, errorMessage } from '@/lib/supabase/client'

interface Count {
  label: string
  hint: string
  value: number | undefined
}

const counts = ref<Count[]>([])
const error = ref<string | null>(null)
const loading = ref(true)

const headCount = (table: string) => db().from(table).select('*', { count: 'exact', head: true })

async function load() {
  loading.value = true
  error.value = null
  try {
    const results = await Promise.all([
      headCount('user_verifications').eq('status', 'pending'),
      headCount('destinations').eq('status', 'published').is('deleted_at', null),
      headCount('destinations').eq('status', 'draft').is('deleted_at', null),
    ])
    const failed = results.find((r) => r.error)
    if (failed?.error) throw failed.error
    const [pending, published, drafts] = results.map((r) => r.count ?? 0)
    counts.value = [
      { label: 'Verification requests waiting', hint: 'Identity, trip contributor, expert and organizer claims', value: pending },
      { label: 'Published destinations', hint: 'Visible to everyone', value: published },
      { label: 'Draft destinations', hint: 'Visible to staff only', value: drafts },
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
    <p class="mt-2 text-sm text-muted">Live counts from the database. Review tools arrive with the next milestone.</p>

    <p v-if="loading" class="mt-8 flex items-center gap-2 text-sm text-muted" role="status">
      <LoaderCircle class="size-4 animate-spin" aria-hidden="true" /> Loading counts
    </p>
    <div v-else-if="error" class="mt-8 flex items-start gap-3" role="alert">
      <CircleAlert class="mt-0.5 size-5 text-danger" aria-hidden="true" />
      <div>
        <p class="font-semibold">Counts could not be loaded</p>
        <p class="text-sm text-muted">{{ error }}</p>
        <button type="button" class="btn btn-quiet mt-3" @click="load">Try again</button>
      </div>
    </div>
    <dl v-else class="mt-8 grid border-t border-line sm:grid-cols-3 sm:border-t-0">
      <div v-for="c in counts" :key="c.label" class="border-b border-line py-5 sm:border-t sm:border-b-0 sm:pr-6 sm:not-first:border-l sm:not-first:pl-6">
        <dt class="text-sm font-semibold">{{ c.label }}</dt>
        <dd class="display tabular mt-2 text-5xl">{{ c.value }}</dd>
        <dd class="mt-1 text-xs text-muted">{{ c.hint }}</dd>
      </div>
    </dl>
  </div>
</template>
