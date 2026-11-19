import { expect, test, type Page } from '@playwright/test'
import { API_URL, createRider, createStaff, revokeStaffRoles, sql } from './support/local'

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

test('a rider account is refused at staff sign in and gets no staff session', async ({ page }) => {
  const rider = await createRider('rider', password)
  await signIn(page, rider.email)
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.')
  await expect(page).toHaveURL(/\/sign-in/)
  // The portal's own session check knows nobody, and typing a staff URL goes back to sign in.
  const session = await page.request.get('/api/v1/admin/auth/session')
  expect((await session.json()).data).toBeNull()
  await page.goto('/riders')
  await expect(page).toHaveURL(/\/sign-in/)
  // The rider's credentials still work where they belong: the rider API (not this portal).
  const riderLogin = await page.request.post(`${API_URL}/api/v1/auth/login`, { headers: { accept: 'application/json' }, data: { email: rider.email, password } })
  expect(riderLogin.status()).not.toBe(422)
})

test('a moderator sees live counts; losing the role locks them out', async ({ page }) => {
  const mod = createStaff('moderator', password, 'moderator')
  await signIn(page, mod.email)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  const published = sql(`select count(*) from destinations where status = 'published' and deleted_at is null`)
  const row = page.locator('dl > div').filter({ hasText: 'Published destinations' })
  await expect(row.locator('dd').first()).toHaveText(published)
  await expect(page.getByText('Moderator', { exact: true })).toBeVisible()

  // Session persists across reloads.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  revokeStaffRoles(mod.id)
  await page.reload()
  await expect(page).toHaveURL(/\/no-access$/)
})

test('wrong password is refused', async ({ page }) => {
  const mod = createStaff('wrongpw', password, 'moderator')
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(mod.email)
  await page.getByLabel('Password').fill('not-it-at-all')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect.')
})
