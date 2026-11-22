import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { createStaff, sql } from './support/local'

// Session 24: staff pause and resume uploads; the media library follows, and existing images keep working.
const password = 'staff-uploads-2026'
const photo = fileURLToPath(new URL('./fixtures/bandipur-bazaar-640.webp', import.meta.url))
const resetUploads = () => {
  sql(`delete from settings where key in ('storage.uploads_enabled', 'storage.uploads_paused_message')`)
  sql(`delete from cache where key like '%mrn.settings'`)
}
test.beforeAll(resetUploads)
test.afterAll(() => {
  resetUploads()
  sql(`delete from media_assets where alt like 'E2E uploads %'`)
})

test('an administrator pauses uploads; the media library hides upload but keeps existing images', async ({ page }, info) => {
  const admin = createStaff(`uploads-${info.project.name}`, password, 'admin')
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  // An image added while uploads are accepted.
  const alt = `E2E uploads ${info.project.name} ${Date.now()}`
  await page.goto('/media')
  await page.getByLabel('Image file').setInputFiles(photo)
  await page.getByLabel('Description (alt text)').fill(alt)
  await page.getByLabel('Credit', { exact: true }).fill('Wikimedia Commons, CC0')
  await page.getByLabel('Licence', { exact: true }).selectOption('cc0')
  await page.getByLabel('Place shown').fill('Bandipur bazaar')
  await page.getByRole('button', { name: 'Add image' }).click()
  await expect(page.getByRole('img', { name: alt })).toBeVisible()

  await page.goto('/settings/storage')
  const status = page.getByTestId('upload-status')
  await expect(status).toContainText('New uploads are accepted.')
  await page.getByLabel('Accept new uploads').uncheck()
  await page.getByRole('button', { name: 'Save storage and uploads' }).click()
  await expect(status).toContainText('New uploads are paused.')
  await expect(status).toContainText('Paused by the setting below.')
  await page.screenshot({ path: `test-results/staff-uploads-paused-${info.project.name}.png` })

  await page.goto('/media')
  await expect(page.getByRole('status').filter({ hasText: 'Photo uploads are paused for now.' })).toContainText('Existing images can still be used, edited and removed.')
  await expect(page.getByLabel('Image file')).toHaveCount(0)
  const existing = page.getByRole('img', { name: alt })
  await expect(existing).toBeVisible()
  expect(await existing.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true)

  await page.goto('/settings/storage')
  await page.getByLabel('Accept new uploads').check()
  await page.getByRole('button', { name: 'Save storage and uploads' }).click()
  await expect(status).toContainText('New uploads are accepted.')
  await page.goto('/media')
  await expect(page.getByLabel('Image file')).toBeVisible()
})
