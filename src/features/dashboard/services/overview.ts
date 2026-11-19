import { api } from '@/lib/api/client'

export const getOverview = async () => (await api.get<{ data: Record<string, number> }>('/admin/overview')).data.data
