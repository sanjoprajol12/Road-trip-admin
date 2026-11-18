import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only the public anon key ever reaches the browser. RLS decides what it can do.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { storageKey: 'mrn-admin-auth' } }) : null

export class NotConfiguredError extends Error {
  constructor() {
    super('The app is not connected to its database yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
  }
}

export function db(): SupabaseClient {
  if (!supabase) throw new NotConfiguredError()
  return supabase
}

/** Turns any thrown value into a sentence a rider can read. */
export function errorMessage(e: unknown): string {
  if (e instanceof NotConfiguredError) return e.message
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    if (/fetch|network/i.test(e.message)) return 'Could not reach the server. Check your connection and try again.'
    return e.message
  }
  return 'Something went wrong. Please try again.'
}
