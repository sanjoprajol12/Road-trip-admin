import { api } from '@/lib/api/client'
import type { Contribution, ModerationEvent } from '@/types/api'

const base = (id: string) => `/admin/contributions/${id}`
export const listForModeration = async (status: string) => (await api.get<{ data: Contribution[] }>('/admin/contributions', { params: { status } })).data.data
export const decideContribution = (id: string, body: { status: string; moderation_note: string | null; source_url: string | null; source_title: string | null }) => api.post(`${base(id)}/decision`, body)
export const requestCorrection = (id: string, note: string) => api.post(`${base(id)}/correction-request`, { note })
export const reviewCorrection = (id: string, accept: boolean) => api.post(`${base(id)}/correction-review`, { accept })
export const dismissReport = (id: string, reportId: number) => api.post(`${base(id)}/reports/${reportId}/dismiss`)
export const confirmStillAccurate = (id: string) => api.post(`${base(id)}/confirm`)
export const moderationHistory = async (id: string) => (await api.get<{ data: ModerationEvent[] }>(`${base(id)}/history`)).data.data
