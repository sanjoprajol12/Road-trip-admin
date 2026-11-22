import { expect, test, type Page } from '@playwright/test'
import { createRider, createStaff, sql } from './support/local'

// places.review (owner-approved): moderators review rider suggestions and corrections only.
const password = 'staff-review-places-2026'
test.afterAll(() => {
  sql(`delete from places where name like 'E2E Review %'`)
  sql(`delete from staff_account_roles where role like 'e2enoreview%'`)
  sql(`delete from roles where slug like 'e2enoreview%'`)
})

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('navigation').first()).toBeVisible()
}

function suggestion(riderId: string, name: string) {
  return sql(`insert into places (id, slug, name, category, description, latitude, longitude, status, submitted_by, created_at, updated_at)
    values (gen_random_uuid(), '${name.toLowerCase().replaceAll(' ', '-')}', '${name}', 'lake', 'Rider text for the review E2E.', 28.4, 84.1, 'pending_review', '${riderId}', now(), now()) returning id`)
}

test('a moderator reviews suggestions and corrections without management or publication controls', async ({ page }, info) => {
  const rider = await createRider(`rev-${info.project.name}`, password)
  const t = `${info.project.name} ${Date.now()}`
  const a = suggestion(rider.id, `E2E Review A ${t}`)
  suggestion(rider.id, `E2E Review B ${t}`)
  suggestion(rider.id, `E2E Review C ${t}`)
  sql(`insert into place_corrections (id, place_id, user_id, body, status, created_at, updated_at) values (gen_random_uuid(), '${a}', '${rider.id}', 'E2E Review correction: the path moved.', 'pending', now(), now())`)
  await signIn(page, createStaff(`placerev-${info.project.name}`, password, 'moderator').email)

  await page.getByRole('link', { name: 'Places' }).click()
  await expect(page.getByRole('button', { name: 'Rider suggestions' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Corrections/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Places/ })).toHaveCount(0) // no management tab
  await expect(page.getByRole('button', { name: 'New place' })).toHaveCount(0)
  // The real API agrees: management and the lifecycle are refused for this account.
  expect((await page.request.get('/api/v1/admin/places', { headers: { accept: 'application/json', referer: page.url() } })).status()).toBe(403)

  const list = page.getByRole('list', { name: 'Suggestions list' })
  await list.getByRole('button', { name: `Review E2E Review B ${t}` }).click()
  await expect(page.getByRole('button', { name: /Publish$|Unpublish|Archive/ })).toHaveCount(0) // no lifecycle controls
  await page.getByRole('button', { name: 'Reject' }).click()
  await expect(page.getByRole('status')).toContainText('at least 10 characters')
  await page.getByLabel(/^Reason/).fill('Private land, not open to visitors.')
  await page.getByRole('button', { name: 'Reject' }).click()
  await expect(page.getByRole('status')).toContainText(`E2E Review B ${t}: Rejected`)

  await list.getByRole('button', { name: `Review E2E Review C ${t}` }).click()
  await page.getByLabel(/^Reason/).fill('Please add how to reach it from the road.')
  await page.getByRole('button', { name: 'Ask for changes' }).click()
  await expect(page.getByRole('status')).toContainText('Changes requested')

  await list.getByRole('button', { name: `Review E2E Review A ${t}` }).click()
  await expect(page.getByRole('list', { name: 'History' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve and publish' }).click()
  await expect(page.getByRole('status')).toContainText(`E2E Review A ${t}: Published`)
  expect(sql(`select string_agg(status, ',' order by name) from places where name like 'E2E Review % ${t}'`)).toBe('published,rejected,changes_requested')
  expect(sql(`select description from places where id = '${a}'`)).toBe('Rider text for the review E2E.') // never rewritten

  await page.getByRole('button', { name: /^Corrections/ }).click()
  const card = page.getByRole('listitem').filter({ hasText: 'E2E Review correction: the path moved.' })
  await card.getByLabel('Note (required)').fill('Checked with the rider photos.')
  await card.getByRole('button', { name: 'Accept' }).click()
  await expect.poll(() => sql(`select status from place_corrections where place_id = '${a}'`)).toBe('accepted')
})

test('staff without places.review get no Places menu and the API refuses them', async ({ page }, info) => {
  const slug = `e2enoreview${info.project.name}${Date.now()}`
  sql(`insert into roles (slug, name, created_at, updated_at) values ('${slug}', '${slug}', now(), now())`)
  sql(`insert into permission_role (role_slug, permission_key) values ('${slug}', 'overview.view')`)
  await signIn(page, createStaff(`norev-${info.project.name}`, password, slug).email)
  await expect(page.getByRole('link', { name: 'Places' })).toHaveCount(0)
  await page.goto('/places')
  await expect(page).not.toHaveURL(/\/places$/)
  expect((await page.request.get('/api/v1/admin/place-suggestions', { headers: { accept: 'application/json', referer: page.url() } })).status()).toBe(403)
})

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('the review screen is usable on a phone', async ({ page }, info) => {
    const rider = await createRider(`revm-${info.project.name}`, password)
    const name = `E2E Review M ${info.project.name} ${Date.now()}`
    suggestion(rider.id, name)
    await signIn(page, createStaff(`placerevm-${info.project.name}`, password, 'moderator').email)
    await page.goto('/places')
    await page.getByRole('button', { name: `Review ${name}` }).click()
    await expect(page.getByRole('button', { name: 'Approve and publish' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true) // no sideways scrolling
    await page.screenshot({ path: `test-results/places-review-phone-${info.project.name}.png`, fullPage: true })
  })
})
