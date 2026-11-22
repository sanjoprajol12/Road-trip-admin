import { api } from '@/lib/api/client'
import type { Page, RideEvent } from '@/types/api'

export const listEvents = async () => (await api.get<Page<RideEvent>>('/admin/events')).data.data
export const cancelEvent = (id: string, reason: string) => api.post(`/admin/events/${id}/cancel`, { reason })
