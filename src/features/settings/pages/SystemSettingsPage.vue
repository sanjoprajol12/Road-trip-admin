<script setup lang="ts">
import { ref } from 'vue'
import { errorMessage } from '@/lib/api/client'
import { clearCache } from '../services/settings'

const message = ref<string | null>(null)
async function clear() {
  try {
    message.value = await clearCache()
  } catch (e) {
    message.value = errorMessage(e)
  }
}
</script>

<template>
  <section class="max-w-2xl" aria-labelledby="s-cache">
    <h2 id="s-cache" class="text-xl font-semibold">Cache</h2>
    <p class="mt-1 text-sm text-muted">Settings are cached and refreshed on every save. Clear the cache only if a change made outside this portal does not show.</p>
    <button type="button" class="btn btn-quiet mt-3" @click="clear">Clear settings cache</button>
    <p v-if="message" class="mt-2 text-sm" role="status">{{ message }}</p>
  </section>
</template>
