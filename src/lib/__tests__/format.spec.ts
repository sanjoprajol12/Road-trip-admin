import { describe, expect, it } from 'vitest'
import { formatDay, formatDayTime } from '../format'

describe('formatDay', () => {
  it('keeps a calendar date on the same day in any timezone', () => {
    expect(formatDay('2026-11-04')).toBe('4 Nov 2026')
    expect(formatDay('2026-01-01')).toBe('1 Jan 2026')
  })
  it('returns empty text for missing or broken values', () => {
    expect(formatDay(null)).toBe('')
    expect(formatDay('not a date')).toBe('')
  })
})

describe('formatDayTime', () => {
  it('shows Nepal time (UTC+5:45)', () => {
    expect(formatDayTime('2026-11-04T09:20:00Z')).toBe('4 Nov 2026, 3:05 pm')
    expect(formatDayTime(null)).toBe('')
  })
})
