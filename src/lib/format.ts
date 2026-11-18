// Dates are always shown in full ("4 Nov 2026"), never as 11/04, so observation dates are unambiguous.
const dayFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kathmandu' })

export function formatDay(value: string | Date | null | undefined): string {
  if (!value) return ''
  // A bare YYYY-MM-DD is a calendar date: pin it to Nepal noon so no timezone can shift the day.
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+05:45`) : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dayFormat.format(date)
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kathmandu' })

/** "4 Nov 2026, 3:05 pm" in Nepal time, for audit trails and decisions. */
export function formatDayTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : `${dayFormat.format(date)}, ${timeFormat.format(date)}`
}
