import { expect, test, type Page } from '@playwright/test'
import { API_URL, createStaff, sql } from './support/local'

// A8: the homepage is edited in the staff portal; after publishing, the public API serves the new content.
const password = 'staff-cms-2026'
const original = () => sql(`select draft_data::text || '|' || coalesce(published_data::text, '') from home_sections where type = 'hero'`)
let saved = ''
test.beforeAll(() => (saved = original()))
test.afterAll(() => {
  const [draft, published] = saved.split('|')
  sql(`update home_sections set draft_data = '${draft!.replaceAll("'", "''")}'::jsonb, published_data = '${published!.replaceAll("'", "''")}'::jsonb where type = 'hero'`)
})

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('staff change the hero heading, publish, and the public homepage serves it', async ({ page, request }, info) => {
  const admin = createStaff(`cms-${info.project.name}`, password, 'admin')
  await signIn(page, admin.email)
  await page.getByRole('link', { name: 'Homepage' }).click()
  const sections = page.getByRole('list', { name: 'Homepage sections, top to bottom' })
  await expect(sections.getByRole('listitem').first()).toContainText('Hero')

  const heading = `Ride Nepal with care ${info.project.name}`.slice(0, 40)
  await page.getByRole('button', { name: 'Edit Hero' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Heading lines 1').fill(heading)
  await dialog.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Hero saved as a draft.' })).toBeVisible()
  await expect(sections.getByRole('listitem').first()).toContainText('Draft changes')

  // Not live until published.
  let home = await (await request.get(`${API_URL}/api/v1/home`, { headers: { accept: 'application/json' } })).json()
  expect(home.data[0].lines[0]).not.toBe(heading)

  await page.getByRole('button', { name: 'Publish homepage' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'The homepage is published.' })).toBeVisible()
  home = await (await request.get(`${API_URL}/api/v1/home`, { headers: { accept: 'application/json' } })).json()
  expect(home.data[0].lines[0]).toBe(heading)
})
