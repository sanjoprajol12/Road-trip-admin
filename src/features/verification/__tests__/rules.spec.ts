import { describe, expect, it } from 'vitest'
import { canReview, decisionLabel, nextStatuses, reasonError } from '../rules'

describe('reasonError', () => {
  it('requires a new reason only for negative decisions', () => {
    expect(reasonError('approved', '', null)).toBeNull()
    expect(reasonError('rejected', 'too short', null)).toMatch(/at least 10/)
    expect(reasonError('suspended', 'Checked ride history.', 'Checked ride history.')).toBe('Write a new reason for this decision.')
    expect(reasonError('revoked', 'Repeated unsafe group rides reported.', 'Checked ride history.')).toBeNull()
  })
})

describe('transitions and permissions (mirror the database)', () => {
  it('only allows the documented moves', () => {
    expect(nextStatuses.pending).toEqual(['approved', 'rejected'])
    expect(nextStatuses.revoked).toEqual([])
  })
  it('keeps organizer and expert decisions for administrators', () => {
    expect(canReview('event_organizer', ['moderator'])).toBe(false)
    expect(canReview('expert_reviewer', ['admin'])).toBe(true)
    expect(canReview('trip_contributor', ['moderator'])).toBe(true)
    expect(canReview('trip_contributor', [])).toBe(false)
  })
  it('names decisions in plain words', () => {
    expect(decisionLabel('suspended', 'approved')).toBe('Reinstate')
    expect(decisionLabel('pending', 'approved')).toBe('Approve')
  })
})
