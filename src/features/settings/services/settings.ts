import { api } from '@/lib/api/client'

// Site settings (/admin/settings/{group}). Each group needs settings.<group>.manage on the server.
export type SettingsValues = Record<string, unknown>
export interface StorageProbe { ok: boolean; disk: string; error: string | null; usage: { library: { files: number; bytes: number }; rider_photos: { files: number; bytes: number } } }

export const getGroup = async (group: string) => (await api.get<{ data: SettingsValues }>(`/admin/settings/${group}`)).data.data
export const saveGroup = async (group: string, values: SettingsValues) => (await api.put<{ data: SettingsValues }>(`/admin/settings/${group}`, values)).data.data
export const testStorage = async () => (await api.post<StorageProbe>('/admin/settings/storage/test')).data
export interface UploadStatus { allowed: boolean; reason: string | null; disk: string; driver: string | null; environment: string }
export const getUploadStatus = async () => (await api.get<{ data: UploadStatus }>('/admin/settings/storage/upload-status')).data.data
export const clearCache = async () => (await api.post<{ message: string }>('/admin/cache/clear')).data.message
export const previewLink = async () => (await api.post<{ url: string }>('/admin/preview-token')).data.url
export interface ProbeResult { ok: boolean; message: string; status?: number | null }
const probe = async (url: string, body?: object): Promise<ProbeResult> => {
  try {
    return (await api.post<ProbeResult>(url, body)).data
  } catch (e) {
    const data = (e as { response?: { data?: ProbeResult & { message?: string } } }).response?.data
    return { ok: false, message: data?.message ?? 'The test could not run.' }
  }
}
export const testMailConnection = () => probe('/admin/settings/mail/test-connection')
export const sendTestMail = () => probe('/admin/settings/mail/test-email')
export const testMapProvider = (which: 'geocoding' | 'routing') => probe('/admin/settings/maps/test', { which })
