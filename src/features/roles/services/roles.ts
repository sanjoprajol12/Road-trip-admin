import { api } from '@/lib/api/client'
import type { PermissionRow, RoleRow } from '@/types/api'

// Roles and the permission registry. Create, change and delete need a fresh password confirmation (423).
export interface RoleBody { name: string; description: string | null; permissions: string[] }
export const listRoles = async () => (await api.get<{ data: RoleRow[] }>('/admin/roles')).data.data
export const listPermissions = async () => (await api.get<{ data: PermissionRow[] }>('/admin/permissions')).data.data
export const saveRole = (slug: string | null, body: RoleBody) => (slug ? api.patch(`/admin/roles/${slug}`, body) : api.post('/admin/roles', body))
export const deleteRole = (slug: string) => api.delete(`/admin/roles/${slug}`)
