import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { API_URL, createStaff, sql } from './support/local'

// Stage 3: site settings reach the public website; the media library enforces credit and licence.
const password = 'staff-settings-2026'
const photo = fileURLToPath(new URL('./fixtures/bandipur-bazaar-640.webp', import.meta.url))

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

// Settings are global: never leave the site closed for the next test (or the next run), whatever happens here.
function resetSiteSettings() {
  sql(`delete from settings where key in ('maintenance.enabled', 'maintenance.message', 'registration.open', 'registration.closed_message')`)
  sql(`delete from cache where key like '%mrn.settings'`) // the API caches settings until they change
}
test.beforeAll(resetSiteSettings)
test.afterEach(resetSiteSettings)

// The public website's rendering of these settings is tested in Road-trip-web (frontend/e2e/site-settings.spec.ts);
// here the staff app must change what the public API serves.
test('maintenance and closed sign-up set in the staff app reach the public API', async ({ page, request }, info) => {
  const admin = createStaff(`settings-admin-${info.project.name}`, password, 'admin')
  await signIn(page, admin.email)
  await page.getByRole('link', { name: 'Settings' }).click()

  const tabs = page.getByRole('navigation', { name: 'Settings sections' })
  await tabs.getByRole('link', { name: 'Maintenance' }).click()
  const maint = page.getByRole('region', { name: 'Maintenance' })
  await maint.getByLabel('Maintenance mode is on').check()
  await maint.getByLabel('Message for visitors').fill('Back after a short E2E maintenance check.')
  await maint.getByRole('button', { name: 'Save maintenance' }).click()
  await expect(maint.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible()

  await tabs.getByRole('link', { name: 'Registration' }).click()
  const reg = page.getByRole('region', { name: 'Registration' })
  await reg.getByLabel('Public sign-up is open').uncheck()
  await reg.getByLabel('Message while closed').fill('Sign-up is paused for an E2E check.')
  await reg.getByRole('button', { name: 'Save registration' }).click()
  await expect(reg.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible()

  const site = await (await request.get(`${API_URL}/api/v1/site`)).json()
  expect(site.data.maintenance).toEqual({ enabled: true, message: 'Back after a short E2E maintenance check.' })
  const closed = await request.get(`${API_URL}/api/v1/destinations`, { headers: { accept: 'application/json' } })
  expect(closed.status()).toBe(503)
  expect((await closed.json()).message).toBe('Back after a short E2E maintenance check.')

  await tabs.getByRole('link', { name: 'Maintenance' }).click()
  await maint.getByLabel('Maintenance mode is on').uncheck()
  await maint.getByRole('button', { name: 'Save maintenance' }).click()
  await expect(maint.getByRole('status').filter({ hasText: 'Saved.' })).toBeVisible()
  expect((await request.get(`${API_URL}/api/v1/destinations`, { headers: { accept: 'application/json' } })).status()).toBe(200)
  const signUp = await request.post(`${API_URL}/api/v1/auth/register`, {
    headers: { accept: 'application/json' },
    data: { display_name: 'E2E closed', email: `closed-${Date.now()}@e2e.test`, password: 'closed-signup-2026' },
  })
  expect(signUp.status()).toBe(403)
  expect((await signUp.json()).message).toBe('Sign-up is paused for an E2E check.')
})

test('the media library needs a credit and an allowed licence, then serves the image', async ({ page }, info) => {
  const mod = createStaff(`media-mod-${info.project.name}`, password, 'moderator')
  await signIn(page, mod.email)
  await page.getByRole('link', { name: 'Media' }).click()
  await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible()

  const alt = `E2E Bandipur bazaar street ${info.project.name} ${Date.now()}`
  await page.getByLabel('Image file').setInputFiles(photo)
  await page.getByLabel('Description (alt text)').fill(alt)
  await page.getByRole('button', { name: 'Add image' }).click()
  await expect(page.locator('.field-error').filter({ hasText: /credit/i })).toBeVisible()

  await page.getByLabel('Credit', { exact: true }).fill('Wikimedia Commons, CC0')
  await page.getByLabel('Licence', { exact: true }).selectOption('cc0')
  await page.getByLabel('Place shown').fill('Bandipur bazaar')
  await page.getByRole('button', { name: 'Add image' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Image added to the library.' })).toBeVisible()
  const img = page.getByRole('list', { name: 'Library images' }).getByRole('img', { name: alt })
  await expect(img).toBeVisible()
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0) // the file is really served

  await page.getByRole('button', { name: `Delete ${alt}` }).click()
  await page.getByRole('button', { name: 'Delete image' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Image deleted.' })).toBeVisible()
  expect(sql(`select count(*) from media_assets where alt = '${alt}'`)).toBe('0')
})
