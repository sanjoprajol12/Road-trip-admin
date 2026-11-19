import { api } from '@/lib/api/client'
import type { Destination, RideRoute } from '@/types/api'

// Destinations, routes and their segments, service points (staff content management).
export const listDestinations = async () => (await api.get<{ data: Destination[] }>('/admin/destinations')).data.data
export const saveDestination = (id: string | null, body: object) => (id ? api.patch(`/admin/destinations/${id}`, body) : api.post('/admin/destinations', body))
export const listRoutes = async () => (await api.get<{ data: RideRoute[] }>('/admin/routes')).data.data
export const getRoute = async (id: string) => (await api.get<{ data: RideRoute }>(`/admin/routes/${id}`)).data.data
export const createRoute = async (body: object) => (await api.post<{ data: RideRoute }>('/admin/routes', body)).data.data
export const updateRoute = async (id: string, body: object) => (await api.patch<{ data: RideRoute }>(`/admin/routes/${id}`, body)).data.data
export const replaceSegments = async (id: string, segments: object[]) => (await api.put<{ data: RideRoute }>(`/admin/routes/${id}/segments`, { segments })).data.data
export const createServicePoint = (body: object) => api.post('/admin/service-points', body)
export const deleteServicePoint = (id: string) => api.delete(`/admin/service-points/${id}`)
