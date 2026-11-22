import { expect, test } from '@playwright/test'
import { createStaff, sql } from './support/local'

// Session 25: restricted moderation evidence (D-04) and account deletion requests as staff see them. The rows are
// inserted directly (the rider-side journey that creates them is covered by the public suite and feature tests).
const password = 'staff-privacy-2026'
const marker = (p: string) => `E2E evidence ${p}`
test.afterAll(() => sql(`delete from moderation_evidence where snapshot->'contribution'->>'title' like 'E2E evidence %'`))

test('only staff with the permission see moderation evidence; viewing is recorded and removal is final', async ({ browser }, info) => {
  const title = marker(`${info.project.name} ${Date.now()}`)
  const id = sql(`insert into moderation_evidence (id, contribution_id, reason, snapshot, files, held_until, created_at, updated_at)
     values (gen_random_uuid(), gen_random_uuid(), 'open_case_on_author_deletion',
       '${JSON.stringify({ author: { display_name: 'Former author', username: null }, contribution: { kind: 'observation', title, body: 'Text kept for the moderators.', observed_on: '2026-11-01', status: 'flagged' }, reports: [{ category: 'other', reason: 'Looks invented.', filed_at: '2026-11-02T10:00:00Z' }] })}'::jsonb,
       '[]'::jsonb, now() + interval '30 days', now(), now()) returning id`)
  sql(`insert into account_deletion_requests (id, user_id, status, requested_at, run_after, choices, created_at, updated_at)
     values (gen_random_uuid(), gen_random_uuid(), 'scheduled', now(), now() + interval '30 days', '{}', now(), now())`)

  // A moderator has no access to the page.
  const moderator = createStaff(`priv-mod-${info.project.name}`, password, 'moderator')
  const modPage = await (await browser.newContext()).newPage()
  await modPage.goto('/sign-in')
  await modPage.getByLabel('Email').fill(moderator.email)
  await modPage.getByLabel('Password').fill(password)
  await modPage.getByRole('button', { name: 'Sign in' }).click()
  await expect(modPage.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await expect(modPage.getByRole('link', { name: 'Deletions and evidence' })).toHaveCount(0)
  expect(await modPage.evaluate(async () => (await fetch('/api/v1/admin/moderation-evidence', { headers: { Accept: 'application/json' } })).status)).toBe(403)

  // An administrator sees it, views it (recorded) and removes it.
  const admin = createStaff(`priv-adm-${info.project.name}`, password, 'admin')
  const page = await (await browser.newContext()).newPage()
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'Deletions and evidence' }).click()
  await expect(page.getByRole('heading', { name: 'Moderation evidence' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Account deletion requests' })).toBeVisible()
  await expect(page.getByText(title)).toHaveCount(0) // the list holds no content
  const row = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'View (recorded)' }) }).first()
  await expect(row).toBeVisible()

  const before = Number(sql(`select count(*) from audit_logs where action = 'moderation.evidence_viewed' and subject_id = '${id}'`))
  await page.evaluate(async (evidenceId) => {
    // open this test's own row (others from parallel projects may be listed too)
    const res = await fetch(`/api/v1/admin/moderation-evidence/${evidenceId}`, { headers: { Accept: 'application/json' }, credentials: 'include' })
    if (!res.ok) throw new Error(String(res.status))
  }, id)
  expect(Number(sql(`select count(*) from audit_logs where action = 'moderation.evidence_viewed' and subject_id = '${id}'`))).toBe(before + 1)

  // Through the screen: view and remove this row.
  await page.reload()
  const mine = page.locator(`[data-evidence-id="${id}"]`)
  await mine.getByRole('button', { name: 'View (recorded)' }).click()
  const details = page.getByRole('article', { name: 'Evidence details' })
  await expect(details.getByText(title)).toBeVisible()
  await expect(details.getByText('Text kept for the moderators.')).toBeVisible()
  await expect(details.getByText(/Looks invented/)).toBeVisible()
  await mine.getByRole('button', { name: 'Remove now' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByRole('article', { name: 'Evidence details' })).toHaveCount(0)
  expect(sql(`select disposition || ' ' || (snapshot is null) from moderation_evidence where id = '${id}'`)).toBe('released true')
  expect(sql(`select count(*) from audit_logs where action = 'moderation.evidence_released' and subject_id = '${id}'`)).toBe('1')
})
