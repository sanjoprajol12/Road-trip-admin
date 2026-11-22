import { api } from '@/lib/api/client'

// Staff sign-in flows that do not need a session (/admin/auth). Staff accounts only; there is no staff sign-up.
export const requestPasswordLink = (email: string) => api.post('/admin/auth/forgot-password', { email })
export const resetPassword = (body: { token: string; email: string; password: string; password_confirmation: string }) => api.post('/admin/auth/reset-password', body)
export const acceptInvitation = (body: { token: string; email: string; password: string; display_name: string | null }) => api.post('/admin/auth/invitations/accept', body)
