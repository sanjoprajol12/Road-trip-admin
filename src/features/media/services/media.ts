import { api } from '@/lib/api/client'

// Media library (/admin/media). The server decodes, re-encodes and checks licence and credit.
export const listMedia = async <T>(q: string) => (await api.get<{ data: T[] }>('/admin/media', { params: { q: q || undefined } })).data.data
export const uploadMedia = (fd: FormData) => api.post('/admin/media', fd)
export const updateMedia = (id: string, body: object) => api.patch(`/admin/media/${id}`, body)
export const deleteMedia = (id: string) => api.delete(`/admin/media/${id}`)
/** Whether new uploads are accepted right now (GET /site, public; no reason or disk). */
export const getUploadState = async () => (await api.get<{ data: { uploads?: { enabled: boolean; message: string | null } } }>('/site')).data.data.uploads ?? { enabled: true, message: null }
