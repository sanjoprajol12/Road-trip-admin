import { api } from '@/lib/api/client'
import type { RiderRow } from '../types'

// Rider accounts (/admin/users). Each call needs its own permission on the server.
export const searchRiders = async (q: string) => (await api.get<{ data: RiderRow[] }>('/admin/users', { params: { q } })).data.data
export const suspendRider = (id: string, until: string, reason: string) => api.post(`/admin/users/${id}/suspension`, { until, reason })
export const liftSuspension = (id: string) => api.delete(`/admin/users/${id}/suspension`)
export const setRiderActive = (id: string, active: boolean, reason: string | null) => api.post(`/admin/users/${id}/activation`, { active, reason })
export const sendRiderReset = (id: string) => api.post(`/admin/users/${id}/password-reset`)
export const revokeRiderSessions = async (id: string) => (await api.delete<{ revoked: number }>(`/admin/users/${id}/sessions`)).data.revoked
