<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { errorMessage } from '@/lib/api/client'
import { formatDayTime } from '@/lib/format'
import type { RideEvent } from '@/types/api'
import { cancelEvent, listEvents } from '../services/events'

const list = ref<RideEvent[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    list.value = await listEvents()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
const target = ref<RideEvent | null>(null)
const reason = ref('')
const msg = ref<string | null>(null)
async function cancel() {
  if (!target.value) return
  try {
    await cancelEvent(target.value.id, reason.value)
    msg.value = `${target.value.title} cancelled; participants were notified.`
    target.value = null
    await load()
  } catch (e) {
    msg.value = errorMessage(e)
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Events</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Every event, including private ones and drafts. Organizers run their own events; staff can cancel one, for example when an organizer's verification is revoked.</p>
    <p v-if="msg" class="mt-4 text-sm" role="status">{{ msg }}</p>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Events could not be loaded.</StatusLine>
    <StatusLine v-else-if="!list.length" state="empty">No events yet.</StatusLine>
    <div v-else class="relative mt-6 overflow-x-auto">
      <table class="w-full min-w-[46rem] border-collapse text-left text-sm">
        <caption class="sr-only">Events</caption>
        <thead><tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase"><th scope="col" class="py-2 pr-4">Event</th><th scope="col" class="py-2 pr-4">Starts</th><th scope="col" class="py-2 pr-4">Organizer</th><th scope="col" class="py-2 pr-4">Status</th><th scope="col" class="py-2"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody>
          <tr v-for="e in list" :key="e.id" class="border-b border-line">
            <td class="py-3 pr-4"><span class="font-semibold">{{ e.title }}</span><span class="block text-xs text-muted">{{ e.category }} · {{ e.visibility }} · {{ e.participant_count }}<template v-if="e.capacity">/{{ e.capacity }}</template> riders</span></td>
            <td class="tabular py-3 pr-4">{{ formatDayTime(e.starts_at) }}</td>
            <td class="py-3 pr-4">{{ e.organizer.display_name }}</td>
            <td class="py-3 pr-4 capitalize">{{ e.status }}</td>
            <td class="py-3 text-right"><button v-if="!['cancelled', 'completed'].includes(e.status)" type="button" class="btn btn-quiet min-h-9 px-3" :aria-label="`Cancel ${e.title}`" @click="(target = e), (reason = '')">Cancel</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <ConfirmDialog :open="!!target" :title="target ? `Cancel ${target.title}?` : ''" confirm-label="Cancel event" danger @confirm="cancel" @cancel="target = null">
      <div class="grid gap-2 text-ink"><p class="text-muted">Participants are notified with your reason.</p><label for="cr" class="text-sm font-semibold">Reason</label><textarea id="cr" v-model="reason" class="input" rows="3" /></div>
    </ConfirmDialog>
  </div>
</template>
