import { expect, test, type Page } from '@playwright/test'
import { createRider, grantRole, revokeRoles, sql } from './support/local'

const password = 'staff-check-2026'

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('signed-out visitors are sent to staff sign in', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/sign-in/)
  await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible()
})

test('a rider account without a staff role gets no access', async ({ page }) => {
  const rider = await createRider('rider', password)
  await signIn(page, rider.email)
  await expect(page).toHaveURL(/\/no-access$/)
  await expect(page.getByRole('heading', { name: 'No staff access' })).toBeVisible()
  await expect(page.getByText(rider.email)).toBeVisible()

  // Typing an admin URL directly does not get past the guard either.
  await page.goto('/')
  await expect(page).toHaveURL(/\/no-access$/)
  await page.getByRole('button', { name: 'Sign in with another account' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('a moderator sees live counts; losing the role locks them out', async ({ page }) => {
  const mod = await createRider('moderator', password)
  grantRole(mod.id, 'moderator')
  await signIn(page, mod.email)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  const published = sql(`select count(*) from destinations where status = 'published' and deleted_at is null`)
  const row = page.locator('dl > div').filter({ hasText: 'Published destinations' })
  await expect(row.locator('dd').first()).toHaveText(published)
  await expect(page.getByText('Moderator', { exact: true })).toBeVisible()

  // Session persists across reloads.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  revokeRoles(mod.id)
  await page.reload()
  await expect(page).toHaveURL(/\/no-access$/)
})

test('wrong password is refused', async ({ page }) => {
  const mod = await createRider('wrongpw', password)
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(mod.email)
  await page.getByLabel('Password').fill('not-it-at-all')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.')
})
