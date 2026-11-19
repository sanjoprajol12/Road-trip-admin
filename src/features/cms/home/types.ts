export interface SectionRow {
  id: string
  type: string
  position: number
  is_visible: boolean
  data: Record<string, unknown>
  published: boolean
  /** Draft differs from what the public website shows. */
  changed: boolean
  publish_at: string | null
  expires_at: string | null
  archived: boolean
  published_at: string | null
}

/** How the editor shows one field of a section type (the server validates every field again: config/home.php). */
export type Field =
  | { key: string; label: string; kind: 'text' | 'textarea'; max: number; optional?: boolean }
  | { key: string; label: string; kind: 'lines'; max: number; maxItems: number }
  | { key: string; label: string; kind: 'link' }
  | { key: string; label: string; kind: 'background' }
  | { key: string; label: string; kind: 'media'; optional?: boolean }
  | { key: string; label: string; kind: 'pick'; source: 'destinations' | 'routes' | 'contributions'; maxItems: number }
  | { key: string; label: string; kind: 'items'; maxItems: number; fields: Field[] }
