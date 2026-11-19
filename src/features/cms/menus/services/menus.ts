import { api } from '@/lib/api/client'

export interface MenuRow { label: string; target: string; signed_in_only: boolean; is_visible: boolean }
export const getMenu = async (location: string) => (await api.get<{ data: MenuRow[] }>(`/admin/cms/menus/${location}`)).data.data
export const saveMenu = async (location: string, items: MenuRow[]) => (await api.put<{ data: MenuRow[] }>(`/admin/cms/menus/${location}`, { items })).data.data
