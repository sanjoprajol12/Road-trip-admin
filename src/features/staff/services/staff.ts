import { api } from '@/lib/api/client'
import type { RoleRow, StaffInvitation, StaffRole } from '@/types/api'
import type { StaffRow } from '../types'

// Staff accounts and invitations (/admin/staff, /admin/staff-invitations). Role changes and invitations need a
// fresh password confirmation (423): wrap them in usePasswordConfirm().run().
export const listStaff = async (q = '') => (await api.get<{ data: StaffRow[] }>('/admin/staff', { params: { q } })).data.data
export const listRoles = async () => (await api.get<{ data: RoleRow[] }>('/admin/roles')).data.data
export const grantRole = (id: string, role: StaffRole) => api.post(`/admin/staff/${id}/roles`, { role })
export const revokeRole = (id: string, role: StaffRole) => api.delete(`/admin/staff/${id}/roles/${role}`)
export const setStaffActive = (id: string, active: boolean, reason: string | null) => api.post(`/admin/staff/${id}/activation`, { active, reason })
export const sendStaffReset = (id: string) => api.post(`/admin/staff/${id}/password-reset`)
export const revokeStaffSessions = async (id: string) => (await api.delete<{ revoked: number }>(`/admin/staff/${id}/sessions`)).data.revoked
export const listInvitations = async () => (await api.get<{ data: StaffInvitation[] }>('/admin/staff-invitations')).data.data
export const sendInvitation = (email: string, roles: StaffRole[]) => api.post('/admin/staff-invitations', { email, roles })
export const withdrawInvitation = (id: string) => api.delete(`/admin/staff-invitations/${id}`)
