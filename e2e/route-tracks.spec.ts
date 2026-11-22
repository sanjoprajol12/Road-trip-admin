import { expect, test } from '@playwright/test'
import { createStaff, sql } from './support/local'

// Real route geometry: staff import a GPX track for a segment; a bad file is refused with a reason.
const password = 'staff-tracks-2026'
test.afterAll(() => sql(`delete from routes where slug like 'e2e-track-%'`))

test('staff import and remove a recorded track for a route segment', async ({ page }, info) => {
  const slug = `e2e-track-${info.project.name}-${Date.now()}`
  const route = sql(`insert into routes (id, slug, name, status, created_at, updated_at) values (gen_random_uuid(), '${slug}', 'E2E Track ${info.project.name}', 'draft', now(), now()) returning id`)
  sql(`insert into route_segments (id, route_id, position, start_name, end_name, surface, start_lat, start_lng, end_lat, end_lng, created_at, updated_at) values (gen_random_uuid(), '${route}', 1, 'A', 'B', 'paved', 28.0, 84.0, 28.1, 84.2, now(), now())`)
  const admin = createStaff(`tracks-${info.project.name}`, password, 'admin')
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.goto(`/routes/${route}`)
  await expect(page.getByText('No recorded track: maps show checkpoints only')).toBeVisible()

  const input = page.getByLabel('Import a GPX or GeoJSON track for segment 1')
  await input.setInputFiles({ name: 'swapped.geojson', mimeType: 'application/geo+json', buffer: Buffer.from('{"type":"LineString","coordinates":[[28,84],[28.1,84.2]]}') })
  await expect(page.getByRole('status')).toContainText('outside Nepal')
  const gpx = '<?xml version="1.0"?><gpx><trk><trkseg><trkpt lat="28.0" lon="84.0"/><trkpt lat="28.05" lon="84.08"/><trkpt lat="28.1" lon="84.2"/></trkseg></trk></gpx>'
  await input.setInputFiles({ name: 'track.gpx', mimeType: 'application/gpx+xml', buffer: Buffer.from(gpx) })
  await expect(page.getByText('Recorded track: 3 points (drawn on maps)')).toBeVisible()
  expect(sql(`select jsonb_array_length(path) from route_segments where route_id = '${route}'`)).toBe('3')
  await page.getByRole('button', { name: 'Remove track' }).click()
  await expect(page.getByText('No recorded track: maps show checkpoints only')).toBeVisible()
  expect(sql(`select coalesce(path::text, 'null') from route_segments where route_id = '${route}'`)).toBe('null')
})

test('staff record riding time per segment and are warned when segments do not add up to the route total', async ({ page }, info) => {
  const slug = `e2e-track-time-${info.project.name}-${Date.now()}`
  const route = sql(`insert into routes (id, slug, name, status, distance_km, created_at, updated_at) values (gen_random_uuid(), '${slug}', 'E2E Track Time ${info.project.name}', 'draft', 100, now(), now()) returning id`)
  sql(`insert into route_segments (id, route_id, position, start_name, end_name, surface, distance_km, created_at, updated_at) values (gen_random_uuid(), '${route}', 1, 'A', 'B', 'paved', 60, now(), now())`)
  const admin = createStaff(`tracktime-${info.project.name}`, password, 'admin')
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.goto(`/routes/${route}`)
  await expect(page.getByText('The segments add up to 60 km, but the route total is 100 km.')).toBeVisible()
  await page.getByLabel('Riding time (h, estimate)').fill('99')
  await page.getByRole('button', { name: 'Save segments' }).click()
  await expect(page.getByText(/riding time field must be between/i).first()).toBeVisible()
  await page.getByLabel('Riding time (h, estimate)').fill('1.5')
  await page.getByLabel('Distance (km)').nth(1).fill('100') // the segment's own distance field
  await page.getByRole('button', { name: 'Save segments' }).click()
  await expect(page.getByText('Segments saved.', { exact: false })).toBeVisible()
  await expect(page.getByText(/The segments add up to/)).toHaveCount(0)
  expect(sql(`select estimated_hours || ',' || distance_km from route_segments where route_id = '${route}'`)).toBe('1.50,100.0')
})
