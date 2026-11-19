import { onMounted, reactive, ref } from 'vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { getGroup, saveGroup, type SettingsValues } from '../services/settings'

/** Load, edit and save one settings group. The server validates; field errors come back from its 422. */
export function useSettingsGroup(group: string) {
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
      Object.assign(values, await saveGroup(group, { ...values }))
      saved.value = 'Saved.'
    } catch (e) {
      errors.value = fieldErrors(e)
      if (!Object.keys(errors.value).length) errors.value = { _: errorMessage(e) }
    } finally {
      saving.value = false
    }
  }

  return { values, errors, saved, loading, loadError, saving, save }
}
