import type { StaffRole as Role, VerificationKind as Kind, VerificationStatus as Status } from '@/types/api'

// Review rules for verification claims. They mirror the database (guard_verification_review,
// can_review_verification) so the screen can explain a refusal before the server makes it.
// The database stays the authority; change both together.

export type VerificationKind = Kind
export type VerificationStatus = Status
export type StaffRole = Role

export const expertScopes = {
  mechanical: 'Motorcycle mechanics',
  medical: 'First aid and medical',
  road_safety: 'Road safety',
} as const
export type ExpertScope = keyof typeof expertScopes

export const REASON_MIN = 10

export const nextStatuses: Record<VerificationStatus, readonly VerificationStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: ['suspended', 'revoked'],
  suspended: ['approved', 'revoked'],
  rejected: [],
  revoked: [],
}

export const needsReason = (to: VerificationStatus) => to === 'rejected' || to === 'suspended' || to === 'revoked'

/** A negative decision needs a new reason of at least REASON_MIN characters. */
export function reasonError(to: VerificationStatus, note: string, previousNote: string | null): string | null {
  if (!needsReason(to)) return null
  if (note.trim().length < REASON_MIN) return `Give a reason of at least ${REASON_MIN} characters. The rider will see it.`
  if (note === previousNote) return 'Write a new reason for this decision.'
  return null
}

/** Organizer and expert decisions are for administrators; other claims for any staff. */
export function canReview(kind: VerificationKind, roles: readonly StaffRole[]): boolean {
  return kind === 'event_organizer' || kind === 'expert_reviewer' ? roles.includes('admin') : roles.length > 0
}

export function decisionLabel(from: VerificationStatus, to: VerificationStatus): string {
  if (to === 'approved') return from === 'suspended' ? 'Reinstate' : 'Approve'
  return { rejected: 'Reject', suspended: 'Suspend', revoked: 'Revoke', pending: 'Reopen' }[to]
}

export const verificationKindLabels: Record<VerificationKind, string> = {
  identity: 'Identity',
  trip_contributor: 'Trip contributor',
  expert_reviewer: 'Expert reviewer',
  event_organizer: 'Event organizer',
}

export const verificationStatusLabels: Record<VerificationStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  revoked: 'Revoked',
}

/** Names of the built-in roles (other roles carry their own name from the API). */
export const staffRoleLabels: Record<StaffRole, string> = {
  moderator: 'Moderator',
  admin: 'Administrator',
}
