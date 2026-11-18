<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { LayoutDashboard, LogOut } from 'lucide-vue-next'
import { useStaff } from '@/features/authentication/staffAccess'
import { db } from '@/lib/supabase/client'

const router = useRouter()
const { session, roles } = useStaff()

// Modules join this list as they are built (verification, moderation, destinations, events, audit log).
const nav = [{ to: '/', label: 'Overview', icon: LayoutDashboard }]

async function signOut() {
  await db().auth.signOut()
  await router.replace('/sign-in')
}
</script>

<template>
  <div class="grid min-h-svh md:grid-cols-[15rem_1fr]">
    <a href="#main" class="sr-only rounded-md bg-ink px-3 py-2 text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
      Skip to content
    </a>
    <aside class="on-night flex flex-col bg-night text-night-text md:sticky md:top-0 md:h-svh">
      <div class="flex items-center justify-between gap-3 px-5 py-4 md:block">
        <p class="display text-xl leading-none">My Ride Nepal</p>
        <p class="label text-marigold md:mt-1.5">Admin</p>
      </div>
      <nav aria-label="Admin" class="flex gap-1 overflow-x-auto px-3 pb-3 md:grid md:pb-0">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold text-night-muted transition-colors hover:text-night-text"
          exact-active-class="bg-night-line !text-night-text"
        >
          <component :is="item.icon" class="size-4" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="mt-auto hidden border-t border-night-line px-5 py-4 text-sm md:block">
        <p class="truncate text-night-text">{{ session?.user.email }}</p>
        <p class="text-night-muted capitalize">{{ roles.join(', ') }}</p>
        <button type="button" class="mt-3 flex items-center gap-2 font-semibold text-night-muted hover:text-night-text" @click="signOut">
          <LogOut class="size-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
    <main id="main" tabindex="-1" class="min-w-0 outline-none">
      <RouterView />
      <button type="button" class="btn btn-quiet m-4 md:hidden" @click="signOut"><LogOut class="size-4" aria-hidden="true" /> Sign out</button>
    </main>
  </div>
</template>
