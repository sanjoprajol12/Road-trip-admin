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
/** Public map settings (tiles, attribution, default view) from GET /site; staff need no settings permission to read them. */
export interface MapSettings { tile_url: string; attribution: string; attribution_url: string | null; default_lat: number; default_lng: number; default_zoom: number }
export const getMapSettings = async () => (await api.get<{ data: { maps?: MapSettings } }>('/site')).data.data.maps ?? null
/** Import a GPX or GeoJSON track as a segment's real geometry (replaces any earlier one); remove it again. */
export const importSegmentPath = async (segmentId: string, file: File) => {
  const fd = new FormData()
  fd.append('track', file)
  return (await api.post<{ data: RideRoute }>(`/admin/route-segments/${segmentId}/path`, fd)).data.data
}
export const removeSegmentPath = async (segmentId: string) => (await api.delete<{ data: RideRoute }>(`/admin/route-segments/${segmentId}/path`)).data.data
