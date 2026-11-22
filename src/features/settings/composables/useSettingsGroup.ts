import { onMounted, reactive, ref } from 'vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { getGroup, saveGroup, type SettingsValues } from '../services/settings'

/** Load, edit and save one settings group. The server validates; field errors come back from its 422. */
export function useSettingsGroup(group: string, secrets: readonly string[] = []) {
  // Secret fields come back as { set: boolean }. They are sent only when typed in (or cleared on purpose).
  const secretInput = reactive<Record<string, { value: string; clear: boolean }>>(Object.fromEntries(secrets.map((k) => [k, { value: '', clear: false }])))
  const values = reactive<SettingsValues>({})
  const errors = ref<Record<string, string>>({})
  const saved = ref<string | null>(null)
  const loading = ref(true)
  const loadError = ref<string | null>(null)
  const saving = ref(false)

  onMounted(async () => {
    try {
      Object.assign(values, await getGroup(group))
    } catch (e) {
      loadError.value = errorMessage(e)
    } finally {
      loading.value = false
    }
  })

  async function save() {
    errors.value = {}
    saved.value = null
    saving.value = true
    try {
      const body: SettingsValues = { ...values }
      for (const k of secrets) {
        delete body[k]
        if (secretInput[k]!.clear) body[k] = null
        else if (secretInput[k]!.value) body[k] = secretInput[k]!.value
      }
      Object.assign(values, await saveGroup(group, body))
      for (const k of secrets) Object.assign(secretInput[k]!, { value: '', clear: false })
      saved.value = 'Saved.'
    } catch (e) {
      errors.value = fieldErrors(e)
      if (!Object.keys(errors.value).length) errors.value = { _: errorMessage(e) }
    } finally {
      saving.value = false
    }
  }

  return { values, errors, saved, loading, loadError, saving, save, secretInput }
}
