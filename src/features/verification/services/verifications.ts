import { api } from '@/lib/api/client'
import type { Page } from '@/types/api'

// Verification claims (/admin/verifications). Who may decide which claim is checked per claim on the server.
export const listClaims = async <T>(params: { status: string; kind: string }) => (await api.get<Page<T>>('/admin/verifications', { params })).data.data
export const getClaim = async <C, H>(id: string) => (await api.get<{ data: C; history: H[] }>(`/admin/verifications/${id}`)).data
export const decideClaim = (id: string, status: string, review_note: string | null) => api.post(`/admin/verifications/${id}/decision`, { status, review_note })
