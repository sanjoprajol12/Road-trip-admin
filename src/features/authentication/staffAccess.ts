import { computed, ref } from 'vue'
import { api, onUnauthorized } from '@/lib/api/client'
import type { StaffRole, StaffUser } from '@/types/api'

export type { StaffRole }
export type Access = 'sign-in' | 'no-access' | 'ok'

/** Route decision. Cosmetic only: every staff endpoint checks the staff session and permission on the server. */
export function accessFor(user: Pick<StaffUser, 'roles'> | null): Access {
  if (!user) return 'sign-in'
  return user.roles.length ? 'ok' : 'no-access'
}

const user = ref<StaffUser | null>(null)
let ready: Promise<void> | null = null

async function load() {
  try {
    user.value = (await api.get<{ data: StaffUser | null }>('/admin/auth/session')).data.data
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
  await api.post('/admin/auth/login', { email, password })
  await load()
}

export async function signOut() {
  try {
    await api.post('/admin/auth/logout')
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
    permissions: computed(() => user.value?.permissions ?? []),
    /** Cosmetic: hides what the server would refuse anyway. A list means "any of these". */
    can: (key: string | readonly string[]) => (typeof key === 'string' ? [key] : key).some((k) => user.value?.permissions.includes(k) ?? false),
    refresh: load,
  }
}
