import { api } from '@/lib/api/client'
import type { Page } from '@/types/api'

export const listAudit = async <T>(params: { subject?: string; page: number }) => (await api.get<Page<T>>('/admin/audit-logs', { params })).data
