import { describe, expect, it } from 'vitest'
import { accessFor } from '../staffAccess'

describe('accessFor', () => {
  it('sends signed-out visitors to sign in', () => expect(accessFor(null)).toBe('sign-in'))
  it('blocks signed-in riders without a staff role', () => expect(accessFor({ roles: [] })).toBe('no-access'))
  it('lets moderators and admins in', () => {
    expect(accessFor({ roles: ['moderator'] })).toBe('ok')
    expect(accessFor({ roles: ['admin'] })).toBe('ok')
  })
})
