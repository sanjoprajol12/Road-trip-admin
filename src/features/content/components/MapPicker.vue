<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Map as LeafletMap, Marker } from 'leaflet'
import { getMapSettings } from '../services/content'

// Click the map or drag the marker to set a position. The latitude/longitude fields next to it stay the accessible,
// keyboard-friendly way to type exact values; both edit the same model. Limited to Nepal (the API validates again).
const lat = defineModel<string | number | null>('lat', { required: true })
const lng = defineModel<string | number | null>('lng', { required: true })
const el = ref<HTMLDivElement | null>(null)
const failed = ref(false)
let map: LeafletMap | null = null
let marker: Marker | null = null
let L: typeof import('leaflet') | null = null
const NEPAL: [[number, number], [number, number]] = [[26.0, 80.0], [31.0, 89.0]]
const round = (n: number) => Math.round(n * 1e6) / 1e6
const current = (): [number, number] | null => (lat.value !== '' && lat.value != null && lng.value !== '' && lng.value != null ? [Number(lat.value), Number(lng.value)] : null)

function place(p: [number, number]) {
  if (!map || !L) return
  if (!marker) {
    marker = L.marker(p, { draggable: true, keyboard: true, title: "Position (drag to adjust)", alt: "Position" }).addTo(map)
    marker.on('dragend', () => {
      const ll = marker!.getLatLng()
      lat.value = round(ll.lat)
      lng.value = round(ll.lng)
    })
  } else marker.setLatLng(p)
}

function clear() {
  lat.value = ''
  lng.value = ''
  marker?.remove()
  marker = null
}

onMounted(async () => {
  if (!el.value) return
  try {
    L = (await import('leaflet')).default
    await import('leaflet/dist/leaflet.css')
    // Leaflet's default marker images are resolved by the bundler.
    const [icon, icon2x, shadow] = await Promise.all([import('leaflet/dist/images/marker-icon.png'), import('leaflet/dist/images/marker-icon-2x.png'), import('leaflet/dist/images/marker-shadow.png')])
    L.Icon.Default.mergeOptions({ iconUrl: icon.default, iconRetinaUrl: icon2x.default, shadowUrl: shadow.default })
    const s = await getMapSettings().catch(() => null)
    map = L.map(el.value, { maxBounds: NEPAL, maxBoundsViscosity: 1, minZoom: 6, zoomAnimation: !matchMedia('(prefers-reduced-motion: reduce)').matches })
    const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
    L.tileLayer(s?.tile_url ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: s ? esc(s.attribution) : '&copy; OpenStreetMap contributors' }).addTo(map)
    const p = current()
    map.setView(p ?? [s?.default_lat ?? 28.2, s?.default_lng ?? 84.1], p ? 12 : (s?.default_zoom ?? 7))
    if (p) place(p)
    map.on('click', (e) => {
      lat.value = round(e.latlng.lat)
      lng.value = round(e.latlng.lng)
    })
  } catch {
    failed.value = true
  }
})
// Typed values move the marker too.
watch([lat, lng], () => {
  const p = current()
  if (p && p[0] >= 26 && p[0] <= 31 && p[1] >= 80 && p[1] <= 89) place(p)
})
onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div class="grid gap-1">
    <div ref="el" class="isolate h-72 rounded-md border border-line bg-surface" data-testid="map-picker" role="application" aria-label="Map: click to set the position, drag the marker to adjust. You can also type the latitude and longitude." />
    <p class="text-xs text-muted">
      <template v-if="failed">The map could not load. Type the latitude and longitude instead.</template>
      <template v-else>Click the map to set the position, or drag the marker. Zoom in for accuracy.</template>
    </p>
    <button v-if="current()" type="button" class="link justify-self-start text-sm" @click="clear">Remove the position</button>
  </div>
</template>
