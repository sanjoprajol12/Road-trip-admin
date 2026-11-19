// Response shapes of the Laravel admin endpoints (web/app/Http/Controllers/Api/V1/Admin). Keep in step.
/** A role slug: the built-in 'admin' and 'moderator', or a role staff created. */
export type StaffRole = string
export type VerificationKind = 'identity' | 'trip_contributor' | 'expert_reviewer' | 'event_organizer'
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'revoked'
export type PublishStatus = 'draft' | 'published' | 'archived'

/** The signed-in staff account (its own account: never a rider account). */
export interface StaffUser {
  id: string
  display_name: string
  email: string
  roles: StaffRole[]
  /** What the UI may offer; the API checks each permission itself. */
  permissions: string[]
  rider_linked: boolean
  last_login_at: string | null
}

export interface RoleRow {
  slug: string
  name: string
  description: string | null
  is_system: boolean
  permissions: string[]
  members: number
}

export interface PermissionRow {
  key: string
  module: string
  action: string
  description: string
}

export interface StaffInvitation {
  id: string
  email: string
  roles: string[]
  expires_at: string
  created_at: string
}

export interface Page<T> {
  data: T[]
  current_page?: number
  last_page?: number
  total?: number
  meta?: { current_page: number; last_page: number; total: number }
}

export interface ClaimRow {
  id: string
  kind: VerificationKind
  scope: string
  status: VerificationStatus
  review_note: string | null
  reviewed_at: string | null
  created_at: string
  user: { id: string; display_name: string; username: string | null } | null
}

export interface ClaimDetail extends ClaimRow {
  statement: string
  can_decide: boolean
  next: VerificationStatus[]
  applicant: { id: string; display_name: string; username: string | null; home_city: string | null; bio: string | null; joined: string | null }
  other_claims: { id: string; kind: VerificationKind; scope: string; status: VerificationStatus }[]
}

export interface HistoryEntry {
  id: number
  action: string
  actor: string | null
  from: string | null
  to: string | null
  note: string | null
  created_at: string
}


export interface AuditEntry {
  id: number
  action: string
  subject_type: string
  subject_id: string
  actor: string | null
  subject_user: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface Destination {
  id: string
  slug: string
  name: string
  province: string | null
  district: string | null
  summary: string | null
  overview: string | null
  elevation_m: number | null
  latitude: number | null
  longitude: number | null
  photo_path: string | null
  photo_alt: string | null
  photo_credit: string | null
  status: PublishStatus
  last_confirmed_on: string | null
  is_dev_seed: boolean
}

export interface ServicePoint {
  id: string
  kind: 'fuel' | 'mechanic' | 'medical' | 'lodging' | 'food' | 'atm' | 'connectivity'
  name: string
  notes: string | null
  position: [number, number] | null
  last_confirmed_on: string | null
}

export interface Segment {
  id: string
  position: number
  start_name: string
  end_name: string
  start: [number, number] | null
  end: [number, number] | null
  distance_km: number | null
  surface: 'paved' | 'mixed' | 'gravel' | 'dirt' | 'unknown'
  notes: string | null
  services: ServicePoint[]
}

export interface RideRoute {
  id: string
  slug: string
  name: string
  summary: string | null
  start: { id: string; slug: string; name: string } | null
  end: { id: string; slug: string; name: string } | null
  distance_km: number | null
  estimated_hours: number | null
  status: PublishStatus
  last_confirmed_on: string | null
  segments?: Segment[]
}

export interface Contribution {
  id: string
  kind: string
  title: string
  body: string
  observed_on: string
  submitted_at: string
  status: string
  details: Record<string, string | number>
  source_url: string | null
  moderation_note: string | null
  author?: { display_name: string; username: string | null; verified: { kind: string; scope: string }[] }
  destination?: { slug: string; name: string } | null
  route?: { slug: string; name: string } | null
  segment?: { id: string; start_name: string; end_name: string } | null
  media?: { id: string; url: string; width: number; height: number; alt: string }[]
  open_reports?: number
  reports?: { reason: string; created_at: string }[]
}

export interface RideEvent {
  id: string
  category: string
  subtype: string
  title: string
  starts_at: string
  ends_at: string
  status: string
  visibility: string
  participant_count: number
  capacity: number | null
  organizer: { display_name: string; username: string | null }
}

export interface Guide {
  id: string
  slug: string
  title: string
  category: 'preparation' | 'mechanical' | 'medical' | 'road_safety' | 'weather' | 'emergency'
  body: string
  sources: string
  status: PublishStatus
  needs_expert_review: boolean
  expert_reviewed: boolean
  expert_reviewed_at: string | null
}
