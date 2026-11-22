/** A rider account as staff see it (GET /admin/users). Riders never hold staff roles. */
export interface RiderRow {
  id: string
  display_name: string
  username: string | null
  /** Only with the users.emails.view permission. */
  email: string | null
  email_verified: boolean
  deactivated_at: string | null
  suspended_until: string | null
  suspension_reason: string | null
  joined_at: string
  /** Repeat-offender signal: contributions rejected, and currently flagged. */
  offences: { rejected: number; flagged: number }
  /** Contribution-only pause (separate from account suspension), with the rider's appeal if any. */
  contribution_suspension: { until: string; reason: string; appeal: string | null; appealed_at: string | null; appeal_decision: string | null } | null
}
