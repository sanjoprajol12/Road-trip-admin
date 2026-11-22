import { expect, test } from '@playwright/test'
import { createStaff } from './support/local'

// Screen-reader structure on the main staff screens (no extra dependencies; axe-core is an owner decision).
const password = 'staff-quality-2026'
const pages = ['/', '/moderation', '/destinations', '/cms/content/page', '/cms/content/post', '/contact', '/riders', '/roles', '/settings/mail', '/settings/maps', '/settings/trust', '/media', '/audit']

test('main staff screens have one h1, labelled controls, named buttons and unique ids', async ({ page }, info) => {
  const admin = createStaff(`quality-${info.project.name}`, password, 'admin')
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  for (const path of pages) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const a = await page.evaluate(() => {
      const visible = (el: Element) => { const r = (el as HTMLElement).getBoundingClientRect(); return getComputedStyle(el).visibility !== 'hidden' && (r.width > 0 || r.height > 0) }
      const named = (el: Element) => !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || (el as HTMLElement).innerText?.trim() || el.getAttribute('title'))
      return {
        h1: [...document.querySelectorAll('h1')].filter(visible).length,
        unlabelled: [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(visible).filter((c) => !(c as HTMLInputElement).labels?.length && !c.getAttribute('aria-label') && !c.getAttribute('aria-labelledby')).map((c) => c.outerHTML.slice(0, 80)),
        unnamed: [...document.querySelectorAll('button, a[href]')].filter(visible).filter((b) => !named(b)).map((b) => b.outerHTML.slice(0, 80)),
        duplicateIds: [...document.querySelectorAll('[id]')].map((e) => e.id).filter((id, i, all) => all.indexOf(id) !== i),
      }
    })
    expect(a.h1, `${path}: one h1`).toBe(1)
    expect(a.unlabelled, `${path}: unlabelled controls`).toEqual([])
    expect(a.unnamed, `${path}: unnamed buttons/links`).toEqual([])
    expect(a.duplicateIds, `${path}: duplicate ids`).toEqual([])
  }
})
