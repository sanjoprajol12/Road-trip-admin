import { computed, ref } from 'vue'
import { api, onUnauthorized } from '@/lib/api/client'
import type { StaffRole, StaffUser } from '@/types/api'

export type { StaffRole }
export type Access = 'sign-in' | 'no-access' | 'ok'

/** Route decision. Cosmetic only: every admin endpoint checks the role on the server. */
export function accessFor(user: Pick<StaffUser, 'roles'> | null): Access {
  if (!user) return 'sign-in'
  return user.roles.length ? 'ok' : 'no-access'
}

const user = ref<StaffUser | null>(null)
let ready: Promise<void> | null = null

async function load() {
  try {
    user.value = (await api.get<{ data: StaffUser | null }>('/auth/session')).data.data
  } catch {
    user.value = null
  }
}
onUnauthorized(() => (user.value = null))

export function initStaff(): Promise<void> {
  ready ??= load()
  return ready
}

export async function signIn(email: string, password: string) {
  await api.post('/auth/login', { email, password })
  await load()
}

export async function signOut() {
  try {
    await api.post('/auth/logout')
  } finally {
    user.value = null
  }
}

export function useStaff() {
  return {
    user,
    roles: computed(() => user.value?.roles ?? []),
    access: computed(() => accessFor(user.value)),
    isAdmin: computed(() => user.value?.roles.includes('admin') ?? false),
    refresh: load,
  }
}
