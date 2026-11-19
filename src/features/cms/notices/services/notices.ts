import { api } from '@/lib/api/client'

export interface NoticeRow { id: string; body: string; level: 'info' | 'warning'; link_label: string | null; link_target: string | null; status: 'draft' | 'published' | 'archived'; publish_at: string | null; expires_at: string | null }
export type NoticeBody = Omit<NoticeRow, 'id'>
export const listNotices = async () => (await api.get<{ data: NoticeRow[] }>('/admin/cms/notices')).data.data
export const saveNotice = (id: string | null, body: NoticeBody) => (id ? api.put(`/admin/cms/notices/${id}`, body) : api.post('/admin/cms/notices', body))
export const deleteNotice = (id: string) => api.delete(`/admin/cms/notices/${id}`)
