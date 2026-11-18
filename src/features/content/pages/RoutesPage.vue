<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import StatusLine from '@/components/ui/StatusLine.vue'
import { api, errorMessage, fieldErrors } from '@/lib/api/client'
import { formatDay } from '@/lib/format'
import type { RideRoute } from '@/types/api'

const router = useRouter()
const list = ref<RideRoute[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
async function load() {
  loading.value = true
  error.value = null
  try {
    list.value = (await api.get<{ data: RideRoute[] }>('/admin/routes')).data.data
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
const form = reactive({ name: '', slug: '' })
const errors = ref<Record<string, string>>({})
async function create() {
  errors.value = {}
  try {
    const { data } = await api.post<{ data: RideRoute }>('/admin/routes', { ...form, status: 'draft' })
    await router.push(`/routes/${data.data.id}`)
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) error.value = errorMessage(e)
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Routes</h1>
    <p class="mt-2 text-sm text-muted">Routes are ordered segments between checkpoints; riders report on each segment.</p>
    <form class="mt-6 flex flex-wrap items-end gap-3" @submit.prevent="create">
      <div class="field"><label for="r-name">New route name</label><input id="r-name" v-model="form.name" class="input w-72" /><p v-if="errors.name" class="field-error">{{ errors.name }}</p></div>
      <div class="field"><label for="r-slug">Address (slug)</label><input id="r-slug" v-model="form.slug" class="input w-56" placeholder="kathmandu-to-pokhara" /><p v-if="errors.slug" class="field-error">{{ errors.slug }}</p></div>
      <button type="submit" class="btn btn-primary" :disabled="!form.name || !form.slug">Create draft</button>
    </form>
    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Routes could not be loaded.</StatusLine>
    <StatusLine v-else-if="!list.length" state="empty">No routes yet.</StatusLine>
    <ul v-else class="mt-6 grid border-t border-line text-sm">
      <li v-for="r in list" :key="r.id" class="flex flex-wrap items-center gap-4 border-b border-line py-3">
        <RouterLink :to="`/routes/${r.id}`" class="link flex-1 font-semibold">{{ r.name }}</RouterLink>
        <span class="capitalize">{{ r.status }}</span>
        <span class="tabular text-muted">{{ r.last_confirmed_on ? `Confirmed ${formatDay(r.last_confirmed_on)}` : 'Never confirmed' }}</span>
      </li>
    </ul>
  </div>
</template>
