import { api } from '@/lib/api/client'
import type { Source } from '@/types/api'

// Places of interest (/admin/places). places.manage edits drafts; places.publish decides (checked by the API).
export const placeCategories: Record<string, string> = {
  viewpoint: 'Viewpoint', lake: 'Lake', waterfall: 'Waterfall', temple: 'Temple', monastery: 'Monastery', heritage: 'Historical place',
  cultural: 'Cultural place', attraction: 'Attraction', rest_stop: 'Rest stop', hidden_place: 'Hidden place', other: 'Other',
}
export const placeStatuses: Record<string, string> = {
  draft: 'Draft', pending_review: 'Waiting for review', changes_requested: 'Changes requested', published: 'Published', rejected: 'Rejected', archived: 'Archived',
}
export interface PlaceRow {
  id: string; slug: string; name: string; category: string; summary: string | null; description: string | null; position: [number, number]
  destination: { slug: string; name: string } | null; destination_id: string | null; media_asset_id: string | null; gallery_ids: string[]
  sources?: Source[]; observed_on: string | null; last_confirmed_on: string | null; status: string; moderation_note: string | null
  suggested_by_rider: boolean; submitted_by_name: string | null; open_corrections: number; updated_at: string
}
export interface PlaceCorrectionRow { id: string; body: string; position: [number, number] | null; status: string; review_note: string | null; created_at: string; rider: string | null; place: { id: string; slug: string; name: string; position: [number, number] } }
export interface PlaceEvent { action: string; at: string; actor: string; actor_type: 'staff' | 'user'; note: string | null }

export const listPlaces = async (params: Record<string, string | number | undefined>) =>
  (await api.get<{ data: PlaceRow[]; meta: { total: number; current_page: number; last_page: number; pending: number; open_corrections: number } }>('/admin/places', { params })).data
export const savePlace = async (id: string | null, body: object) => (id ? await api.put<{ data: PlaceRow }>(`/admin/places/${id}`, body) : await api.post<{ data: PlaceRow }>('/admin/places', body)).data.data
export const decidePlace = async (id: string, decision: string, note: string | null) => (await api.post<{ data: PlaceRow }>(`/admin/places/${id}/decision`, { decision, note })).data.data
export const placeHistory = async (id: string) => (await api.get<{ data: PlaceEvent[] }>(`/admin/places/${id}/history`)).data.data
export const listCorrections = async (status: string) => (await api.get<{ data: PlaceCorrectionRow[] }>('/admin/place-corrections', { params: { status } })).data.data
export const decideCorrection = (id: string, decision: 'accepted' | 'rejected', note: string) => api.post(`/admin/place-corrections/${id}/decision`, { decision, note })
// places.review: rider suggestions only (approve, request changes, reject). No create, edit, unpublish or archive.
export const listSuggestions = async (status: string, page = 1) =>
  (await api.get<{ data: PlaceRow[]; meta: { total: number; current_page: number; last_page: number; pending: number } }>('/admin/place-suggestions', { params: { status, page } })).data
export const getSuggestion = async (id: string) => (await api.get<{ data: PlaceRow; history: PlaceEvent[] }>(`/admin/place-suggestions/${id}`)).data
export const decideSuggestion = async (id: string, decision: 'approve' | 'request_changes' | 'reject', note: string | null) =>
  (await api.post<{ data: PlaceRow }>(`/admin/place-suggestions/${id}/decision`, { decision, note })).data.data
