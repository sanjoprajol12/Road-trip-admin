import { expect, test } from '@playwright/test'
import { createStaff, sql } from './support/local'

// L2: staff set a destination's position by clicking the map; the coordinates are saved and stay inside Nepal.
const password = 'staff-map-2026'

test.afterAll(() => sql(`delete from destinations where slug like 'e2e-map-%'`))

test('staff place a destination on the map and the position is saved', async ({ page }, info) => {
  const slug = `e2e-map-${info.project.name}-${Date.now()}`
  const name = `E2E Map ${info.project.name} ${Date.now()}`
  sql(`insert into destinations (id, slug, name, status, is_dev_seed, created_at, updated_at) values (gen_random_uuid(), '${slug}', '${name}', 'draft', true, now(), now())`)
  const admin = createStaff(`map-${info.project.name}`, password, 'admin')
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.goto('/destinations')
  await page.getByRole('button', { name: `Edit ${name}` }).click()

  const map = page.getByTestId('map-picker')
  await expect(map.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByLabel('Latitude', { exact: true })).toHaveValue('')
  await map.click({ position: { x: 200, y: 140 } })
  await expect(page.getByLabel('Latitude', { exact: true })).not.toHaveValue('')
  await expect(map.locator('.leaflet-marker-icon')).toBeVisible()
  const lat = Number(await page.getByLabel('Latitude', { exact: true }).inputValue())
  const lng = Number(await page.getByLabel('Longitude', { exact: true }).inputValue())
  expect(lat).toBeGreaterThan(26)
  expect(lat).toBeLessThan(31)
  expect(lng).toBeGreaterThan(80)
  expect(lng).toBeLessThan(89)

  // Typing exact values moves the marker; saving stores them.
  await page.getByLabel('Latitude', { exact: true }).fill('28.209583')
  await page.getByLabel('Longitude', { exact: true }).fill('83.985567')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: `Edit ${name}` })).toHaveCount(0) // the form closes after a successful save
  await expect.poll(() => sql(`select latitude || ',' || longitude from destinations where slug = '${slug}'`)).toBe('28.209583,83.985567')

  // Reopening shows the saved position on the map.
  await page.getByRole('button', { name: `Edit ${name}` }).click()
  await expect(page.getByLabel('Latitude', { exact: true })).toHaveValue('28.209583')
  await expect(page.getByTestId('map-picker').locator('.leaflet-marker-icon')).toBeVisible()
  await page.getByTestId('map-picker').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('map-picker').locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('map-picker').locator('..').screenshot({ path: `test-results/map-picker-${info.project.name}.png` })
})
