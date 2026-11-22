import { api } from '@/lib/api/client'

// Account deletions (dates and counts only) and the restricted moderation evidence kept after a deletion (D-04).
export interface DeletionRow {
  id: string
  status: 'scheduled' | 'cancelled' | 'done'
  requested_at: string
  run_after: string
  cancelled_at: string | null
  completed_at: string | null
  counts: Record<string, number>
  attempts: number
  last_error: string | null
}
export interface EvidenceRow {
  id: string
  contribution_id: string
  reason: string
  created_at: string
  held_until: string
  disposition: 'expired' | 'released' | null
  disposed_at: string | null
}
export interface EvidenceDetail extends EvidenceRow {
  snapshot: {
    author?: { display_name: string; username: string | null }
    contribution?: { kind: string; title: string; body: string; observed_on: string; status: string }
    reports?: { category: string; reason: string; filed_at: string }[]
    report?: { category: string; reason: string; filed_at: string }
  }
  files: string[]
}
export const listDeletions = async () => (await api.get<{ data: DeletionRow[]; file_retries: number }>('/admin/account-deletions')).data
export const listEvidence = async () => (await api.get<{ data: EvidenceRow[] }>('/admin/moderation-evidence')).data.data
export const showEvidence = async (id: string) => (await api.get<{ data: EvidenceDetail }>(`/admin/moderation-evidence/${id}`)).data.data
export const releaseEvidence = (id: string) => api.post(`/admin/moderation-evidence/${id}/release`)
