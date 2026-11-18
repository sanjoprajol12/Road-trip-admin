import { ref } from 'vue'
import { api, statusOf } from '@/lib/api/client'

/**
 * Role changes need a recent password confirmation (HTTP 423 from Laravel's password.confirm).
 * run(fn) tries fn; on 423 it asks for the password, confirms it, then retries once.
 */
export function usePasswordConfirm() {
  const asking = ref(false)
  const password = ref('')
  const error = ref<string | null>(null)
  let resume: ((ok: boolean) => void) | null = null

  async function run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      if (statusOf(e) !== 423) throw e
      const ok = await new Promise<boolean>((res) => {
        resume = res
        password.value = ''
        error.value = null
        asking.value = true
      })
      if (!ok) throw new Error('Cancelled.')
      return fn()
    }
  }

  async function confirm() {
    try {
      await api.post('/auth/confirm-password', { password: password.value })
      asking.value = false
      resume?.(true)
    } catch {
      error.value = 'That password is not correct.'
    }
  }
  function cancel() {
    asking.value = false
    resume?.(false)
  }

  return { asking, password, error, run, confirm, cancel }
}
