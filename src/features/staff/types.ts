import type { StaffRole } from '@/types/api'

/** A staff account (GET /admin/staff). */
export interface StaffRow {
  id: string
  display_name: string
  /** Only with the users.emails.view permission. */
  email: string | null
  roles: StaffRole[]
  /** Carried-over accounts have no password until they use a staff password link. */
  has_password: boolean
  rider_linked: boolean
  deactivated_at: string | null
  last_login_at: string | null
  created_at: string
}
