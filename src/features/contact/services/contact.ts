import { api } from '@/lib/api/client'

export interface ContactMessage { id: string; name: string; email: string; subject: string; body: string; status: 'new' | 'open' | 'done' | 'spam'; read_at: string | null; created_at: string }
export const listMessages = async (params: { status?: string; q?: string; page?: number }) =>
  (await api.get<{ data: ContactMessage[]; meta: { total: number; current_page: number; last_page: number; unread: number } }>('/admin/contact-messages', { params })).data
export const updateMessage = (id: string, body: { status?: string; read?: boolean }) => api.patch(`/admin/contact-messages/${id}`, body)
export const deleteMessage = (id: string) => api.delete(`/admin/contact-messages/${id}`)
