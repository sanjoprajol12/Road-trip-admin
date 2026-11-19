import { api } from '@/lib/api/client'
import type { Contribution } from '@/types/api'

export const listForModeration = async (status: string) => (await api.get<{ data: Contribution[] }>('/admin/contributions', { params: { status } })).data.data
export const decideContribution = (id: string, body: { status: string; moderation_note: string | null; source_url: string | null }) => api.post(`/admin/contributions/${id}/decision`, body)
