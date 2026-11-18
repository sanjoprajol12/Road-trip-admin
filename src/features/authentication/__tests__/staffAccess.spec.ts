import { describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { accessFor } from '../staffAccess'

const session = { user: { id: 'u1' } } as Session

describe('accessFor', () => {
  it('sends signed-out visitors to sign in', () => expect(accessFor(null, ['admin'])).toBe('sign-in'))
  it('blocks signed-in riders without a staff role', () => expect(accessFor(session, [])).toBe('no-access'))
  it('lets moderators and admins in', () => {
    expect(accessFor(session, ['moderator'])).toBe('ok')
    expect(accessFor(session, ['admin'])).toBe('ok')
  })
})
