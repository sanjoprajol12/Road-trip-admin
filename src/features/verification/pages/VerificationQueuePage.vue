<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { expertScopes, verificationKindLabels, verificationStatusLabels, type ExpertScope, type VerificationKind, type VerificationStatus } from '../rules'
import StatusLine from '@/components/ui/StatusLine.vue'
import { api, errorMessage } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import type { ClaimRow, Page } from '@/types/api'

const route = useRoute()
const router = useRouter()
const statuses = Object.keys(verificationStatusLabels) as VerificationStatus[]
const kinds = Object.keys(verificationKindLabels) as VerificationKind[]
// Filters live in the URL so a filtered queue can be shared and survives reload.
const status = ref<VerificationStatus | 'all'>([...statuses, 'all'].includes(String(route.query.status)) ? (route.query.status as VerificationStatus) : 'pending')
const kind = ref<VerificationKind | 'all'>(kinds.includes(route.query.kind as VerificationKind) ? (route.query.kind as VerificationKind) : 'all')
const rows = ref<ClaimRow[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    rows.value = (await api.get<Page<ClaimRow>>('/admin/verifications', { params: { status: status.value, kind: kind.value } })).data.data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
watch(
  [status, kind],
  () => {
    void router.replace({ query: { status: status.value === 'pending' ? undefined : status.value, kind: kind.value === 'all' ? undefined : kind.value } })
    void load()
  },
  { immediate: true },
)
const scopeLabel = (s: string) => expertScopes[s as ExpertScope] ?? s
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Verification</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Claims riders made about themselves. Each is decided on its own; organizer and expert claims need an administrator.</p>
    <form class="mt-6 flex flex-wrap gap-4" @submit.prevent>
      <div class="field">
        <label for="f-status">Status</label>
        <select id="f-status" v-model="status" class="input w-44">
          <option v-for="s in statuses" :key="s" :value="s">{{ verificationStatusLabels[s] }}</option>
          <option value="all">All statuses</option>
        </select>
      </div>
      <div class="field">
        <label for="f-kind">Claim</label>
        <select id="f-kind" v-model="kind" class="input w-52">
          <option value="all">All claims</option>
          <option v-for="k in kinds" :key="k" :value="k">{{ verificationKindLabels[k] }}</option>
        </select>
      </div>
    </form>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Claims could not be loaded.</StatusLine>
    <StatusLine v-else-if="!rows.length" state="empty">No claims match these filters.</StatusLine>
    <div v-else class="relative mt-6 overflow-x-auto">
      <table class="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption class="sr-only">Verification claims</caption>
        <thead>
          <tr class="border-b border-line-strong text-xs tracking-wide text-muted uppercase">
            <th scope="col" class="py-2 pr-4 font-semibold">Rider</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Claim</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Status</th>
            <th scope="col" class="py-2 pr-4 font-semibold">Applied</th>
            <th scope="col" class="py-2 font-semibold">Decided</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" class="border-b border-line hover:bg-surface">
            <td class="py-3 pr-4">
              <RouterLink :to="`/verification/${r.id}`" class="link font-semibold">{{ r.user?.display_name ?? 'Deleted account' }}</RouterLink>
              <span v-if="r.user?.username" class="block text-xs text-muted">@{{ r.user.username }}</span>
            </td>
            <td class="py-3 pr-4">{{ verificationKindLabels[r.kind] }}<span v-if="r.scope" class="text-muted">: {{ scopeLabel(r.scope) }}</span></td>
            <td class="py-3 pr-4">{{ verificationStatusLabels[r.status] }}</td>
            <td class="tabular py-3 pr-4">{{ formatDay(r.created_at) }}</td>
            <td class="tabular py-3">{{ formatDay(r.reviewed_at) || '–' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
