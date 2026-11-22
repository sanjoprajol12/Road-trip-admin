import { api } from '@/lib/api/client'

// The signed-in staff member's own staff account.
export const changePassword = (body: { current_password: string; password: string; password_confirmation: string }) => api.put('/admin/auth/password', body)
export const linkRider = (email: string, password: string) => api.post('/admin/auth/rider-link', { email, password })
export const unlinkRider = () => api.delete('/admin/auth/rider-link')
