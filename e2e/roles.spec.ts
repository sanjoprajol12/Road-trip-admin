import { expect, test, type Page } from '@playwright/test'
import { API_URL, TEST_EMAIL_DOMAIN, authLinkFromEmail, createStaff, sql } from './support/local'

// Stage 2: configurable roles, staff invitations and what a custom role can reach.
const password = 'staff-roles-2026'

async function signIn(page: Page, email: string, pw = password) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(pw)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

async function confirmPassword(page: Page) {
  await page.getByLabel('Password', { exact: true }).last().fill(password)
  await page.getByRole('button', { name: 'Confirm', exact: true }).click()
}

test.afterAll(() => {
  sql(`delete from staff_account_roles where role like 'e2e_%'`)
  sql(`delete from roles where slug like 'e2e_%'`)
  sql(`delete from staff_invitations where email like '%@${TEST_EMAIL_DOMAIN}'`)
})

test('an administrator creates a role, invites someone into it, and the new staff member sees only that area', async ({ page, browser }, info) => {
  const admin = createStaff(`roles-admin-${info.project.name}`, password, 'admin')
  const roleName = `E2E desk ${info.project.name.replace('admin-', '')} ${Date.now() % 1e6}`
  const inviteEmail = `invitee-${info.project.name}-${Date.now()}@${TEST_EMAIL_DOMAIN}`

  await signIn(page, admin.email)
  await page.getByRole('link', { name: 'Roles' }).click()
  await page.getByRole('button', { name: 'New role' }).click()
  await page.getByLabel('Name', { exact: true }).fill(roleName)
  await page.getByRole('checkbox', { name: /^manage Create, edit and publish destinations/ }).check()
  await page.getByRole('button', { name: 'Save role' }).click()
  await confirmPassword(page)
  await expect(page.getByRole('status').filter({ hasText: `Role "${roleName}" saved.` })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Roles' }).getByText(roleName)).toBeVisible()

  await page.getByRole('link', { name: 'Staff', exact: true }).click()
  await page.getByLabel('Email address').fill(inviteEmail)
  await page.getByRole('group', { name: 'Roles' }).getByLabel(roleName).check()
  await page.getByRole('button', { name: 'Send invitation' }).click()
  // The password was confirmed a moment ago, so no second prompt.
  await expect(page.getByRole('status').filter({ hasText: `Invitation sent to ${inviteEmail}` })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Open invitations' }).getByText(inviteEmail)).toBeVisible()

  // The invitee opens the emailed link in their own browser session.
  const link = await authLinkFromEmail(inviteEmail, 'invitation')
  expect(link.startsWith('http://127.0.0.1:4181/accept-invitation?')).toBe(true)
  const ctx = await browser.newContext()
  const invitee = await ctx.newPage()
  await invitee.goto(link)
  await expect(invitee.getByText(`Invitation for ${inviteEmail}.`)).toBeVisible()
  await invitee.getByLabel('Name other people will see').fill('E2E Invitee')
  await invitee.getByLabel(/Choose a staff password/).fill('invitee-pass-2026')
  await invitee.getByRole('button', { name: 'Accept invitation' }).click()
  await expect(invitee.getByText('Invitation accepted.')).toBeVisible()
  await invitee.getByRole('link', { name: 'Sign in' }).click()
  await signIn(invitee, inviteEmail, 'invitee-pass-2026')

  // A role without the overview lands on its first allowed area, and the menu shows only that.
  await expect(invitee).toHaveURL(/\/destinations$/)
  const nav = invitee.getByRole('navigation', { name: 'Admin' })
  await expect(nav.getByRole('link')).toHaveText(['Destinations'])
  await invitee.goto('/staff')
  await expect(invitee).toHaveURL(/\/destinations$/)
  await ctx.close()

  // The link works only once.
  const again = await (await fetch(`${API_URL}/api/v1/admin/auth/invitations/accept`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ ...Object.fromEntries(new URL(link).searchParams), password: 'invitee-pass-2026', display_name: 'Again' }),
  })).status
  expect(again).toBe(422)
})
