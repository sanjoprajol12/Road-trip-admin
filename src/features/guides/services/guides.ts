import { api } from '@/lib/api/client'
import type { Guide } from '@/types/api'

export const listGuides = async () => (await api.get<{ data: Guide[] }>('/admin/guides')).data.data
export const saveGuide = (id: string | null, body: object) => (id ? api.patch(`/admin/guides/${id}`, body) : api.post('/admin/guides', body))
export const publishGuide = (id: string) => api.post(`/admin/guides/${id}/publish`)
