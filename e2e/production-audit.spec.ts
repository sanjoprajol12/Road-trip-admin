import { expect, test, type Page } from '@playwright/test'
import { createStaff } from './support/local'

// Session 22 production-readiness audit of the staff portal, without new dependencies: WCAG text contrast and
// visible, unobscured keyboard focus. Same checks as the public site's production-audit.spec.ts (no shared code).
const password = 'staff-audit-2026'
const pages = ['/', '/moderation', '/destinations', '/routes', '/places', '/cms/home', '/cms/content/page', '/contact', '/riders', '/roles', '/settings/mail', '/media', '/audit']

async function signIn(page: Page, label: string) {
  const admin = createStaff(`audit-${label}`, password, 'admin')
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
}

/** Text below WCAG AA contrast (4.5:1, or 3:1 for large text) against its real, solid background. */
async function contrastFailures(page: Page) {
  return page.evaluate(() => {
    // Any CSS colour (rgb, oklab, color-mix) to [r, g, b, a] by letting the browser paint it.
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    const parse = (c: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
      return [r!, g!, b!, a! / 255]
    }
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
    }
    const blend = (top: number[], a: number, bottom: number[]) => top.map((v, i) => v * a + bottom[i]! * (1 - a))
    // The solid colour behind an element; null when an image or gradient is behind it (cannot be judged here).
    const backdrop = (el: Element | null): number[] | null => {
      if (!el) return [255, 255, 255]
      const s = getComputedStyle(el)
      if (s.backgroundImage !== 'none') return null
      const [r, g, b, a] = parse(s.backgroundColor)
      // A see-through fixed layer (the header) sits over whatever scrolls beneath it: not judged here.
      if (a < 0.9 && (s.position === 'fixed' || s.position === 'sticky')) return null
      if (a === 0) return backdrop(el.parentElement)
      if (a >= 1) return [r, g, b]
      const under = backdrop(el.parentElement)
      return under && blend([r, g, b], a, under)
    }
    const out: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = new Set<Element>()
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || seen.has(el) || !n.textContent?.trim()) continue
      seen.add(el)
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      if (r.width < 2 || r.height < 2 || s.visibility === 'hidden' || s.display === 'none') continue
      if (el.closest('[disabled], [aria-disabled="true"], .leaflet-container, option, .sr-only, [aria-hidden="true"]')) continue // disabled UI and map tiles are exempt or not text
      let opacity = 1
      for (let p: Element | null = el; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity)
      if (opacity < 0.95) continue // mid reveal-animation, or disabled styling
      const bg = backdrop(el)
      if (!bg) continue
      const [cr, cg, cb, ca] = parse(s.color)
      const fg = blend([cr, cg, cb], ca, bg)
      const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a)
      const ratio = (l1! + 0.05) / (l2! + 0.05)
      const size = parseFloat(s.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700)
      if (ratio < (large ? 3 : 4.5)) out.push(`${ratio.toFixed(2)}:1 "${n.textContent.trim().slice(0, 40)}" (${s.color} on rgb(${bg.map(Math.round).join(',')}))`)
    }
    return out
  })
}

/** Tab through the page: each stop must show a focus indicator and not be hidden under the sticky header. */
async function focusProblems(page: Page, stops = 30) {
  const problems: string[] = []
  for (let i = 0; i < stops; i++) {
    await page.keyboard.press('Tab')
    const p = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 1) || s.boxShadow !== 'none'
      const r = el.getBoundingClientRect()
      const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1)
      const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 10), 0), innerHeight - 1)
      const hit = document.elementFromPoint(x, y)
      const covered = r.height > 0 && hit !== null && !el.contains(hit) && !hit.contains(el) && !!hit.closest('header')
      const label = (el.getAttribute('aria-label') || el.textContent || el.outerHTML).trim().slice(0, 90)
      return !ring ? `no visible focus: ${label}` : covered ? `covered by the header: ${label}` : ''
    })
    if (p === null) break
    if (p) problems.push(p)
  }
  return problems
}

test('staff screens meet WCAG AA contrast', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium', 'colour maths is browser-independent; run once')
  test.setTimeout(180_000)
  await signIn(page, `contrast-${info.project.name}`)
  const found: Record<string, string[]> = {}
  for (const path of pages) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const f = await contrastFailures(page)
    if (f.length) found[path] = f
  }
  console.log('staff contrast failures:', JSON.stringify(found, null, 1))
  expect(found).toEqual({})
})

test('staff keyboard focus is visible and not hidden', async ({ page }, info) => {
  test.setTimeout(180_000)
  await signIn(page, `focus-${info.project.name}`)
  const found: Record<string, string[]> = {}
  for (const path of ['/', '/destinations', '/cms/home', '/settings/mail', '/riders']) {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const f = await focusProblems(page, 40)
    if (f.length) found[path] = f
  }
  console.log(`staff focus problems (${info.project.name}):`, JSON.stringify(found, null, 1))
  expect(found).toEqual({})
})
