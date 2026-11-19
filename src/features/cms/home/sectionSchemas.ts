import type { Field } from './types'

// Editor layout per section type, mirroring config/home.php (limits are enforced again by the API).
const link = (key: string, label: string): Field => ({ key, label, kind: 'link' })
export const sectionSchemas: Record<string, Field[]> = {
  hero: [
    { key: 'eyebrow', label: 'Small line above the heading', kind: 'text', max: 60, optional: true },
    { key: 'lines', label: 'Heading lines', kind: 'lines', max: 40, maxItems: 3 },
    { key: 'lead', label: 'Description', kind: 'textarea', max: 320, optional: true },
    link('primary_cta', 'Main button'),
    link('secondary_cta', 'Second button'),
    { key: 'background', label: 'Background photo', kind: 'background' },
    { key: 'photo_credit', label: 'Photo credit shown on the page', kind: 'text', max: 120, optional: true },
  ],
  slides: [
    { key: 'heading', label: 'Heading (optional)', kind: 'text', max: 80, optional: true },
    { key: 'items', label: 'Slides', kind: 'items', maxItems: 5, fields: [
      { key: 'heading', label: 'Heading', kind: 'text', max: 80 },
      { key: 'text', label: 'Text', kind: 'textarea', max: 240, optional: true },
      { key: 'media_id', label: 'Image', kind: 'media' },
      link('cta', 'Button'),
    ] },
  ],
  layers: [
    { key: 'heading', label: 'Heading', kind: 'text', max: 120 },
    { key: 'intro', label: 'Introduction', kind: 'textarea', max: 400, optional: true },
    { key: 'items', label: 'Items', kind: 'items', maxItems: 6, fields: [
      { key: 'name', label: 'Name', kind: 'text', max: 40 },
      { key: 'text', label: 'Text', kind: 'textarea', max: 240 },
    ] },
  ],
  featured_destinations: [
    { key: 'heading', label: 'Heading', kind: 'text', max: 80 },
    { key: 'link_label', label: 'Link text', kind: 'text', max: 40, optional: true },
    { key: 'ids', label: 'Destinations (none chosen: the newest)', kind: 'pick', source: 'destinations', maxItems: 7 },
  ],
  featured_routes: [
    { key: 'heading', label: 'Heading', kind: 'text', max: 80 },
    { key: 'link_label', label: 'Link text', kind: 'text', max: 40, optional: true },
    { key: 'ids', label: 'Routes (none chosen: the newest)', kind: 'pick', source: 'routes', maxItems: 6 },
  ],
  featured_experiences: [
    { key: 'heading', label: 'Heading', kind: 'text', max: 80 },
    { key: 'link_label', label: 'Link text', kind: 'text', max: 40, optional: true },
    { key: 'ids', label: 'Rider experiences (none chosen: the newest)', kind: 'pick', source: 'contributions', maxItems: 6 },
  ],
  freshness: [
    { key: 'heading', label: 'Heading', kind: 'text', max: 120 },
    { key: 'text', label: 'Text', kind: 'textarea', max: 400, optional: true },
    { key: 'legend', label: 'Legend', kind: 'items', maxItems: 6, fields: [
      { key: 'term', label: 'Term', kind: 'text', max: 30 },
      { key: 'detail', label: 'Meaning', kind: 'text', max: 160 },
    ] },
    { key: 'caption', label: 'Caption', kind: 'textarea', max: 240, optional: true },
  ],
  banner: [
    { key: 'heading', label: 'Heading', kind: 'text', max: 80 },
    { key: 'text', label: 'Text', kind: 'textarea', max: 240, optional: true },
    { key: 'media_id', label: 'Image', kind: 'media', optional: true },
    link('cta', 'Button'),
  ],
  text: [
    { key: 'heading', label: 'Heading', kind: 'text', max: 120 },
    { key: 'body', label: 'Text (blank line = new paragraph)', kind: 'textarea', max: 2000 },
  ],
}
