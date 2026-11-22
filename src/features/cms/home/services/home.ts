import { api } from '@/lib/api/client'
import type { SectionRow } from '../types'

// Homepage sections (/admin/cms/home). Edits change drafts; publish needs cms.home.publish.
export const listSections = async () => (await api.get<{ data: SectionRow[]; types: { type: string; label: string }[]; bundled_photos: string[] }>('/admin/cms/home/sections')).data
export const addSection = async (type: string) => (await api.post<{ data: SectionRow }>('/admin/cms/home/sections', { type })).data.data
export const updateSection = async (id: string, body: Partial<Pick<SectionRow, 'data' | 'is_visible' | 'publish_at' | 'expires_at'>>) => (await api.patch<{ data: SectionRow }>(`/admin/cms/home/sections/${id}`, body)).data.data
export const reorderSections = (ids: string[]) => api.put('/admin/cms/home/order', { ids })
export const archiveSection = (id: string, restore = false) => api.post(`/admin/cms/home/sections/${id}/${restore ? 'restore' : 'archive'}`)
export const publishHome = async () => (await api.post<{ published: number }>('/admin/cms/home/publish')).data.published
export const previewLink = async () => (await api.post<{ url: string }>('/admin/preview-token')).data.url
/** Choices for featured items and images (staff lists, already permission-checked). */
export const pickerOptions = async (kind: 'destinations' | 'routes' | 'media' | 'contributions') =>
  (await api.get<{ data: { id: string; name?: string; title?: string; alt?: string; status?: string }[] }>(`/admin/${kind}`, { params: kind === 'contributions' ? { status: 'published' } : {} })).data.data
