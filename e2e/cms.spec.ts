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

test('staff write a question, publish it from the Content screen, and read the contact inbox', async ({ page, request }, info) => {
  const admin = createStaff(`content-${info.project.name}`, password, 'admin')
  const question = `E2E CMS staff question ${info.project.name} ${Date.now()}`
  sql(`insert into contact_messages (id, name, email, subject, body, status, created_at, updated_at) values (gen_random_uuid(), 'E2E Visitor', 'visitor@e2e.test', '${question} inbox', 'A message created only for the admin E2E suite.', 'new', now(), now())`)
  await signIn(page, admin.email)
  await page.getByRole('link', { name: 'Content', exact: true }).click()
  await page.getByRole('navigation', { name: 'Content types' }).getByRole('link', { name: 'FAQs' }).click()
  await page.getByRole('button', { name: 'New question' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('.field-error').first()).toBeVisible() // question and answer are required
  await page.getByLabel('Question', { exact: true }).fill(question)
  await page.getByLabel(/^Answer/).fill('Yes, as long as someone knows your plan.')
  await page.getByLabel(/^Group/).fill('Trips')
  await page.getByLabel('Status', { exact: true }).selectOption('published')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Question saved' })).toBeVisible()
  await expect(page.getByRole('cell', { name: question, exact: true })).toBeVisible()
  // Reopening an existing entry for editing (regression: structuredClone of a reactive row threw DataCloneError).
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: `Edit ${question}` }).click()
  await expect(page.getByLabel('Question', { exact: true })).toHaveValue(question)

  const faqs = await (await request.get(`${API_URL}/api/v1/content/faq`, { headers: { accept: 'application/json' } })).json()
  expect(faqs.data.map((f: { title: string }) => f.title)).toContain(question)
  expect(sql(`select count(*) from audit_logs where action = 'cms.faq.created' and new_data->>'title' = '${question}'`)).toBe('1')

  await page.getByRole('link', { name: 'Contact messages' }).click()
  await page.getByRole('button', { name: new RegExp(`${question} inbox`) }).click()
  await expect(page.getByText('A message created only for the admin E2E suite.')).toBeVisible()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await expect.poll(() => sql(`select status from contact_messages where subject = '${question} inbox'`)).toBe('done')
  sql(`delete from cms_entries where title = '${question}'`)
  sql(`delete from contact_messages where subject = '${question} inbox'`)
})
