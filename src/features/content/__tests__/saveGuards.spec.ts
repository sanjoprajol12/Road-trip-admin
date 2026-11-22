import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import GuidesPage from '@/features/guides/pages/GuidesPage.vue'
import DestinationsPage from '@/features/content/pages/DestinationsPage.vue'
import RouteEditorPage from '@/features/content/pages/RouteEditorPage.vue'
import ContentPage from '@/features/cms/content/pages/ContentPage.vue'

// A request the test finishes by hand, so it can click again while the first one is still running.
function deferred<T = unknown>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)))
  return { promise, resolve, reject }
}

type Service = (...args: unknown[]) => Promise<unknown>
const guides = vi.hoisted(() => ({ listGuides: vi.fn<Service>(), saveGuide: vi.fn<Service>(), publishGuide: vi.fn<Service>() }))
vi.mock('@/features/guides/services/guides', () => guides)
const content = vi.hoisted(() => ({
  listDestinations: vi.fn<Service>(), saveDestination: vi.fn<Service>(), getRoute: vi.fn<Service>(), createServicePoint: vi.fn<Service>(),
  deleteServicePoint: vi.fn<Service>(), importSegmentPath: vi.fn<Service>(), removeSegmentPath: vi.fn<Service>(), replaceSegments: vi.fn<Service>(), updateRoute: vi.fn<Service>(),
}))
vi.mock('@/features/content/services/content', () => content)
const cms = vi.hoisted(() => ({ getTypes: vi.fn<Service>(), listEntries: vi.fn<Service>(), saveEntry: vi.fn<Service>(), deleteEntry: vi.fn<Service>() }))
vi.mock('@/features/cms/content/services/content', () => cms)
vi.mock('@/features/cms/home/services/home', () => ({ previewLink: vi.fn<Service>() }))

async function mountPage(component: object, props: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/content/:type?', name: 'cms-content', component: { template: '<div />' } },
      { path: '/:rest(.*)*', component: { template: '<div />' } },
    ],
  })
  await router.push('/content/page')
  const w = mount(component, { props, global: { plugins: [router], stubs: { MapPicker: true, SourcesEditor: true, EntryFields: true, ConfirmDialog: true } } })
  await flushPromises()
  return w
}
const submitButton = (w: VueWrapper, form: string) => w.get(`${form} button[type="submit"]`)

interface Case {
  name: string
  save: ReturnType<typeof vi.fn<Service>>
  idle: string
  open: () => Promise<VueWrapper>
  form: string
  /** Gets the form ready for another submit after a success (some pages close it, the service form clears its name). */
  again: (w: VueWrapper) => Promise<void>
}

const cases: Case[] = [
  {
    name: 'guide', save: guides.saveGuide, idle: 'Save', form: 'form',
    open: async () => {
      const w = await mountPage(GuidesPage)
      await w.get('button.btn-primary').trigger('click') // New guide
      return w
    },
    again: async (w) => void (await w.findAll('button').find((b) => b.text() === 'New guide')!.trigger('click')),
  },
  {
    name: 'destination', save: content.saveDestination, idle: 'Save', form: 'form',
    open: async () => {
      const w = await mountPage(DestinationsPage)
      await w.findAll('button').find((b) => b.text() === 'New destination')!.trigger('click')
      return w
    },
    again: async (w) => void (await w.findAll('button').find((b) => b.text() === 'New destination')!.trigger('click')),
  },
  {
    name: 'CMS entry', save: cms.saveEntry, idle: 'Save', form: 'form.bg-surface',
    open: async () => {
      const w = await mountPage(ContentPage)
      await w.findAll('button').find((b) => b.text().startsWith('New page'))!.trigger('click')
      return w
    },
    again: async () => {}, // the form stays open on the saved entry
  },
  {
    name: 'route service point', save: content.createServicePoint, idle: 'Add', form: 'form[class*="md:grid-cols-6"]',
    open: async () => {
      const w = await mountPage(RouteEditorPage, { id: 'r1' })
      await w.get('#svs').setValue('s1')
      await w.get('#svn').setValue('Fuel stop')
      return w
    },
    again: async (w) => void (await w.get('#svn').setValue('Second stop')), // the name is cleared after adding
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  guides.listGuides.mockResolvedValue([])
  content.listDestinations.mockResolvedValue([])
  content.getRoute.mockResolvedValue({
    id: 'r1', name: 'Test route', slug: 'test-route', summary: null, status: 'draft', start: null, end: null, distance_km: null, estimated_hours: null,
    last_confirmed_on: null, sources: [], services: [],
    segments: [{ id: 's1', position: 1, start_name: 'A', end_name: 'B', start: null, end: null, distance_km: null, estimated_hours: null, surface: 'paved', notes: null, path: [], services: [] }],
  })
  cms.getTypes.mockResolvedValue({ data: [{ type: 'page', label: 'Pages', singular: 'Page', core: ['slug', 'body'], fields: [], public: 'detail' }], can_publish: true })
  cms.listEntries.mockResolvedValue({ data: [], meta: { total: 0, current_page: 1, last_page: 1 } })
})

describe.each(cases)('creating a $name', (c) => {
  it('sends one request however often it is submitted, shows "Saving…" and restores the button on success', async () => {
    const req = deferred<{ id: string }>()
    c.save.mockReturnValue(req.promise)
    const w = await c.open()
    const form = w.get(c.form)
    await form.trigger('submit')
    await form.trigger('submit') // the handler guard: a disabled button alone does not stop a second submit event
    await form.trigger('submit')
    expect(c.save).toHaveBeenCalledTimes(1)
    expect(submitButton(w, c.form).text()).toBe('Saving…')
    expect(submitButton(w, c.form).attributes('disabled')).toBeDefined()
    expect(submitButton(w, c.form).attributes('aria-busy')).toBe('true')

    req.resolve({ id: 'new-1' })
    await flushPromises()
    await c.again(w)
    expect(submitButton(w, c.form).text()).toBe(c.idle)
    expect(submitButton(w, c.form).attributes('aria-busy')).toBe('false')
    expect(submitButton(w, c.form).attributes('disabled')).toBeUndefined()

    // A new request can go out once the first finished.
    c.save.mockResolvedValue({ id: 'new-2' })
    await w.get(c.form).trigger('submit')
    expect(c.save).toHaveBeenCalledTimes(2)
  })

  it('restores the button after a failure and allows another try', async () => {
    const req = deferred()
    c.save.mockReturnValue(req.promise)
    const w = await c.open()
    await w.get(c.form).trigger('submit')
    await w.get(c.form).trigger('submit')
    expect(c.save).toHaveBeenCalledTimes(1)
    req.reject(new Error('The server is unreachable'))
    await flushPromises()
    const btn = submitButton(w, c.form)
    expect(btn.text()).toBe(c.idle)
    expect(btn.attributes('disabled')).toBeUndefined()
    c.save.mockResolvedValue({ id: 'new-1' })
    await w.get(c.form).trigger('submit')
    expect(c.save).toHaveBeenCalledTimes(2)
  })
})
