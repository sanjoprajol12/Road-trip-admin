import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { db, supabase } from '@/lib/supabase/client'

export type StaffRole = 'moderator' | 'admin'
export type Access = 'sign-in' | 'no-access' | 'ok'

/** Route decision. Cosmetic only: RLS refuses staff data to anyone without a role row. */
export function accessFor(session: Session | null, roles: StaffRole[]): Access {
  if (!session) return 'sign-in'
  return roles.length ? 'ok' : 'no-access'
}

const session = ref<Session | null>(null)
const roles = ref<StaffRole[]>([])
let ready: Promise<void> | null = null

async function loadRoles() {
  if (!session.value) {
    roles.value = []
    return
  }
  // RLS returns only the signed-in user's own role rows.
  const { data, error } = await db().from('user_roles').select('role').eq('user_id', session.value.user.id)
  roles.value = error ? [] : data.map((r) => r.role as StaffRole)
}

export function initStaff(): Promise<void> {
  ready ??= (async () => {
    if (!supabase) return
    session.value = (await supabase.auth.getSession()).data.session
    await loadRoles()
    supabase.auth.onAuthStateChange((_event, next) => {
      const changedUser = next?.user.id !== session.value?.user.id
      session.value = next
      if (changedUser) void loadRoles()
    })
  })()
  return ready
}

export function useStaff() {
  return {
    session,
    roles,
    access: computed(() => accessFor(session.value, roles.value)),
    isAdmin: computed(() => roles.value.includes('admin')),
    refresh: loadRoles,
  }
}
