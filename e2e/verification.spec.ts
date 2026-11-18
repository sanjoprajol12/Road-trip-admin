import { expect, test, type Page } from '@playwright/test'
import { claimStatus, createClaim, createContribution, createRider, grantRole, sql } from './support/local'

const password = 'staff-review-2026'

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

test('moderators decide trip contributor claims but not organizer claims', async ({ page }) => {
  const rider = await createRider('applicant', password)
  const organizerClaim = createClaim(rider.id, 'event_organizer', 'Led weekend rides to Bandipur for two seasons.')
  const tripClaim = createClaim(rider.id, 'trip_contributor', 'Rode the Kaligandaki road to Jomsom in October.')
  const mod = await createRider('mod', password)
  grantRole(mod.id, 'moderator')
  await signIn(page, mod.email)

  // Admin-only areas are hidden and unreachable for moderators.
  await expect(page.getByRole('link', { name: 'Audit log' })).toHaveCount(0)
  await page.goto('/audit')
  await expect(page).toHaveURL(/\/$/)

  await page.getByRole('link', { name: 'Verification', exact: true }).click()
  await expect(page.getByRole('link', { name: 'E2E applicant' }).first()).toBeVisible()

  await page.goto(`/verification/${organizerClaim}`)
  await expect(page.getByText('Only administrators decide organizer and expert claims.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)

  await page.goto(`/verification/${tripClaim}`)
  await expect(page.getByText('Rode the Kaligandaki road to Jomsom in October.')).toBeVisible()
  await page.getByRole('button', { name: 'Approve' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Pending review → Approved')).toBeVisible()
  expect(claimStatus(tripClaim)).toBe('approved')
})

test('an administrator approves, suspends with a reason and reinstates an organizer', async ({ page }) => {
  const rider = await createRider('organizer', password)
  const claim = createClaim(rider.id, 'event_organizer', 'Organised the annual Pokhara rider meetup since 2022.')
  const admin = await createRider('admin', password)
  grantRole(admin.id, 'admin')
  await signIn(page, admin.email)

  await page.goto(`/verification/${claim}`)
  await page.getByRole('button', { name: 'Approve' }).click()
  await page.getByLabel('Note for the rider (optional)').fill('Confirmed with two riders who attended.')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click()
  await expect(page.getByText('Pending review → Approved')).toBeVisible()

  // Suspension needs a fresh reason; the approval note does not count.
  await page.getByRole('button', { name: 'Suspend' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Give a reason of at least 10 characters')).toBeVisible()
  await page.getByLabel('Reason (shown to the rider)').fill('Report of an unsafe overtaking incident on a group ride; reviewing.')
  await page.getByRole('button', { name: 'Continue' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Their rights from this claim stop immediately.')
  await dialog.getByRole('button', { name: 'Suspend' }).click()
  await expect(page.getByText('Approved → Suspended')).toBeVisible()
  expect(claimStatus(claim)).toBe('suspended')

  await page.getByRole('button', { name: 'Reinstate' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reinstate' }).click()
  await expect(page.getByText('Suspended → Approved')).toBeVisible()
  // History shows who decided and why.
  await expect(page.getByText('“Report of an unsafe overtaking incident on a group ride; reviewing.”')).toBeVisible()
  await expect(page.getByText(/E2E admin ·/).first()).toBeVisible()
})

test('administrators manage staff roles (with password confirmation) and read the audit log', async ({ page }) => {
  const person = await createRider('promote', password)
  const admin = await createRider('roles-admin', password)
  grantRole(admin.id, 'admin')
  await signIn(page, admin.email)

  await page.getByRole('link', { name: 'People' }).click()
  await page.getByLabel(/Find people/).fill(person.email)
  await page.getByRole('button', { name: 'Search' }).click()
  const row = page.getByRole('row', { name: new RegExp(person.email) })
  await expect(row.getByRole('cell', { name: 'Rider', exact: true })).toBeVisible()

  await row.getByRole('button', { name: /Make E2E promote moderator/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Give role' }).click()
  // Role changes need the password again.
  const confirm = page.getByRole('dialog').filter({ hasText: 'Confirm your password' })
  await confirm.getByLabel('Password').fill('wrong-password')
  await confirm.getByRole('button', { name: 'Confirm' }).click()
  await expect(confirm.getByText('That password is not correct.')).toBeVisible()
  await confirm.getByLabel('Password').fill(password)
  await confirm.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'is now moderator' })).toHaveText('E2E promote is now moderator.')
  await expect(row.getByRole('cell', { name: 'Moderator', exact: true })).toBeVisible()
  expect(sql(`select role from user_roles where user_id = '${person.id}'`)).toBe('moderator')

  await row.getByRole('button', { name: /Remove moderator role from E2E promote/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove role' }).click()
  await expect(row.getByRole('cell', { name: 'Rider', exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Audit log' }).click()
  await page.getByLabel('Show').selectOption('user_roles')
  const entries = page.getByRole('list', { name: 'Audit entries, newest first' })
  await expect(entries.getByText('role.removed').first()).toBeVisible()
  await expect(entries.getByText(/of E2E promote · by E2E roles-admin/).first()).toBeVisible()
})

test('a moderator publishes a pending contribution from the moderation queue', async ({ page }) => {
  const author = await createRider('author', password)
  const id = createContribution(author.id, 'E2E trip waiting for review')
  const mod = await createRider('mod-pub', password)
  grantRole(mod.id, 'moderator')
  await signIn(page, mod.email)
  await page.getByRole('link', { name: 'Moderation' }).click()
  const card = page.getByRole('listitem').filter({ hasText: 'E2E trip waiting for review' })
  await expect(card.getByText('A trip write-up created by the admin E2E suite only.')).toBeVisible()
  await card.getByLabel('Decision').selectOption('rejected')
  await card.getByRole('button', { name: 'Apply' }).click()
  await expect(card.getByRole('alert')).toContainText('at least 10 characters')
  await card.getByLabel('Decision').selectOption('published')
  await card.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('E2E trip waiting for review')).toHaveCount(0)
  expect(sql(`select status from contributions where id = '${id}'`)).toBe('published')
  const pub = await fetch(`http://127.0.0.1:8010/api/v1/contributions/${id}`, { headers: { accept: 'application/json' } })
  expect(pub.status).toBe(200)
})
