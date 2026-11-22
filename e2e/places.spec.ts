import { expect, test, type Page } from '@playwright/test'
import { API_URL, createRider, createStaff, sql } from './support/local'

// Places of interest in the staff portal: create with the map, publish, review a rider suggestion, corrections.
const password = 'staff-places-2026'
test.afterAll(() => sql(`delete from places where name like 'E2E Place %'`))

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

test('staff create a place on the map, publish it, and the public API serves it', async ({ page, request }, info) => {
  const name = `E2E Place Staff ${info.project.name} ${Date.now()}`
  await signIn(page, createStaff(`places-${info.project.name}`, password, 'admin').email)
  await page.goto('/places')
  await page.getByRole('button', { name: 'New place' }).click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.locator('.field-error').first()).toBeVisible() // empty form refused
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByLabel('Category', { exact: true }).selectOption('viewpoint')
  await page.getByLabel('Description').fill('A place created only by the staff E2E suite.')
  await page.getByLabel('Latitude', { exact: true }).fill('35')
  await page.getByLabel('Longitude', { exact: true }).fill('84')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(/latitude field must be between/i)).toBeVisible() // outside Nepal refused by the API

  const map = page.getByTestId('map-picker')
  await expect(map.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15_000 })
  await map.click({ position: { x: 300, y: 150 } })
  const lat = Number(await page.getByLabel('Latitude', { exact: true }).inputValue())
  expect(lat).toBeGreaterThan(26.3)
  expect(lat).toBeLessThan(30.5)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('cell', { name: new RegExp(`^${name}`) })).toBeVisible()
  expect(sql(`select status from places where name = '${name}'`)).toBe('draft')

  const slug = sql(`select slug from places where name = '${name}'`)
  expect((await request.get(`${API_URL}/api/v1/places/${slug}`, { headers: { accept: 'application/json' } })).status()).toBe(404)
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByRole('region', { name: `Edit ${name}` }).getByText('Published', { exact: true })).toBeVisible()
  await expect.poll(() => sql(`select status from places where name = '${name}'`)).toBe('published')
  const pub = await (await request.get(`${API_URL}/api/v1/places/${slug}`, { headers: { accept: 'application/json' } })).json()
  expect(pub.data.position[0]).toBeCloseTo(lat, 5)
  await page.getByTestId('map-picker').scrollIntoViewIfNeeded()
  await page.screenshot({ path: `test-results/places-editor-${info.project.name}.png` })
})

test('a moderator sends a rider suggestion back with a reason, sees the history, and reviews a correction', async ({ page }, info) => {
  const rider = await createRider(`placer-${info.project.name}`, password)
  const name = `E2E Place Suggested ${info.project.name} ${Date.now()}`
  const id = sql(`insert into places (id, slug, name, category, description, latitude, longitude, status, submitted_by, created_at, updated_at)
    values (gen_random_uuid(), 'e2e-sugg-${info.project.name}-${Date.now()}', '${name}', 'lake', 'A suggestion created only by the staff E2E suite.', 28.5, 83.9, 'pending_review', '${rider.id}', now(), now()) returning id`)
  sql(`insert into audit_logs (actor_id, actor_type, action, subject_type, subject_id, created_at) values ('${rider.id}', 'user', 'place.suggested', 'places', '${id}', now())`)
  await signIn(page, createStaff(`placemod-${info.project.name}`, password, 'admin').email)
  await page.goto('/places')
  await page.getByRole('button', { name: `Open ${name}` }).click()
  await page.getByRole('button', { name: 'Ask for changes' }).click()
  await expect(page.getByRole('status')).toContainText('at least 10 characters')
  await page.getByLabel(/^Reason/).fill('Please add how to reach it from the road.')
  await page.getByRole('button', { name: 'Ask for changes' }).click()
  await expect(page.getByText('Note to the rider: Please add how to reach it from the road.')).toBeVisible()
  expect(sql(`select status from places where id = '${id}'`)).toBe('changes_requested')
  await page.getByRole('button', { name: 'History' }).click()
  const history = page.getByRole('list', { name: 'History' })
  await expect(history).toContainText('suggested')
  await expect(history).toContainText('request changes')

  // Corrections: a rider's correction on a published place is accepted with a note; the place is not changed by it.
  sql(`update places set status = 'published' where id = '${id}'`)
  sql(`insert into place_corrections (id, place_id, user_id, body, status, created_at, updated_at) values (gen_random_uuid(), '${id}', '${rider.id}', 'The path is closed since the monsoon.', 'pending', now(), now())`)
  await page.reload()
  await page.getByRole('button', { name: /^Corrections/ }).click()
  const card = page.getByRole('listitem').filter({ hasText: 'The path is closed since the monsoon.' })
  await card.getByLabel('Note (required)').fill('Checked with a local rider.')
  await card.getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Now edit' })).toContainText(name)
  expect(sql(`select status from place_corrections where place_id = '${id}'`)).toBe('accepted')
})
