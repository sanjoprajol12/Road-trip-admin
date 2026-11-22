<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useStaff } from '@/features/authentication/staffAccess'
import { settingsGroups } from '../settingsGroups'

const { can } = useStaff()
const tabs = computed(() => settingsGroups.filter((g) => can(g.permission)))
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <h1 class="display text-4xl">Settings</h1>
    <p class="mt-2 max-w-2xl text-sm text-muted">Every change is kept in the audit log. Secret values, when a section has them, are never shown again after saving.</p>
    <nav class="mt-6 flex flex-wrap gap-1 border-b border-line" aria-label="Settings sections">
      <RouterLink v-for="t in tabs" :key="t.path" :to="`/settings/${t.path}`" class="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-muted hover:text-ink" active-class="!border-crimson !text-ink">{{ t.label }}</RouterLink>
    </nav>
    <div class="mt-8"><RouterView /></div>
  </div>
</template>
