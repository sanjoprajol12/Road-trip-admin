import { api } from '@/lib/api/client'

// Generic CMS entries (pages, FAQs, blog, team, popups, banners). Field descriptors come from the API (config/cms.php).
export interface CmsField { key: string; label: string; kind: 'text' | 'textarea' | 'select' | 'link' | 'ref' | 'refs' | 'blocks' | 'number'; required?: boolean; max?: number; options?: Record<string, string>; ref?: string }
export interface CmsType { type: string; label: string; singular: string; core: ('slug' | 'summary' | 'body' | 'media' | 'seo')[]; fields: CmsField[]; public: 'list' | 'detail' | 'active'; title_label?: string; body_label?: string; summary_label?: string; body_required?: boolean }
export interface CmsEntry {
  id: string
  type: string
  slug: string | null
  title: string
  summary: string | null
  body: string | null
  data: Record<string, unknown>
  media_asset_id: string | null
  status: 'draft' | 'published' | 'archived'
  publish_at: string | null
  expires_at: string | null
  position: number
  seo_title: string | null
  seo_description: string | null
  updated_at: string
}
export type CmsEntryBody = Omit<CmsEntry, 'id' | 'type' | 'updated_at'>

export const getTypes = async () => (await api.get<{ data: CmsType[]; can_publish: boolean }>('/admin/cms/types')).data
export const listEntries = async (type: string, params: { q?: string; status?: string; page?: number } = {}) =>
  (await api.get<{ data: CmsEntry[]; meta: { total: number; current_page: number; last_page: number } }>(`/admin/cms/entries/${type}`, { params })).data
export const saveEntry = async (type: string, id: string | null, body: CmsEntryBody) =>
  (id ? await api.put<{ data: CmsEntry }>(`/admin/cms/entries/${type}/${id}`, body) : await api.post<{ data: CmsEntry }>(`/admin/cms/entries/${type}`, body)).data.data
export const deleteEntry = (type: string, id: string) => api.delete(`/admin/cms/entries/${type}/${id}`)
