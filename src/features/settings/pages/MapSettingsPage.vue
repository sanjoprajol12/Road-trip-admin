<script setup lang="ts">
import { ref } from 'vue'
import { PlugZap } from 'lucide-vue-next'
import SettingsForm from '../components/SettingsForm.vue'
import SecretField from '../components/SecretField.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'
import { testMapProvider, type ProbeResult } from '../services/settings'

const s = useSettingsGroup('maps', ['geocoding_key', 'routing_key'])
const { values, errors, secretInput } = s
const result = ref<Record<string, ProbeResult | null>>({ geocoding: null, routing: null })
async function test(which: 'geocoding' | 'routing') {
  result.value[which] = await testMapProvider(which)
}
const isSet = (k: string) => !!(values[k] as { set?: boolean } | undefined)?.set
</script>

<template>
  <SettingsForm title="Maps" intro="Map tiles are loaded by visitors' browsers. Geocoding and routing providers are used only by the server, and only after the owner chooses one (decision D2): until then the website shows recorded routes and straight-line distances. A filled-in provider is not connected until its test passes." :state="s" save-label="Save map settings">
    <div class="field"><label for="mp-tile">Tile address</label><input id="mp-tile" v-model="values.tile_url" class="input" :aria-invalid="!!errors.tile_url" /><p class="field-hint">https only, with {z}, {x} and {y}. The website's content security policy must allow this host (vercel.json).</p><p v-if="errors.tile_url" class="field-error">{{ errors.tile_url }}</p></div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="field"><label for="mp-attr">Attribution (shown on every map)</label><input id="mp-attr" v-model="values.attribution" class="input" maxlength="200" /><p v-if="errors.attribution" class="field-error">{{ errors.attribution }}</p></div>
      <div class="field"><label for="mp-attr-url">Attribution link</label><input id="mp-attr-url" v-model="values.attribution_url" type="url" class="input" /><p v-if="errors.attribution_url" class="field-error">{{ errors.attribution_url }}</p></div>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="field"><label for="mp-lat">Default centre latitude</label><input id="mp-lat" v-model.number="values.default_lat" type="number" step="0.0001" class="input" /><p v-if="errors.default_lat" class="field-error">{{ errors.default_lat }}</p></div>
      <div class="field"><label for="mp-lng">Default centre longitude</label><input id="mp-lng" v-model.number="values.default_lng" type="number" step="0.0001" class="input" /><p v-if="errors.default_lng" class="field-error">{{ errors.default_lng }}</p></div>
      <div class="field"><label for="mp-zoom">Default zoom</label><input id="mp-zoom" v-model.number="values.default_zoom" type="number" min="5" max="14" class="input" /><p v-if="errors.default_zoom" class="field-error">{{ errors.default_zoom }}</p></div>
    </div>
    <fieldset v-for="which in (['geocoding', 'routing'] as const)" :key="which" class="grid gap-3 rounded-md border border-line p-4">
      <legend class="px-1 font-semibold">{{ which === 'geocoding' ? 'Place search (geocoding)' : 'Routing (distances and riding times)' }}</legend>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="field"><label :for="`mp-${which}-p`">Provider</label>
          <select :id="`mp-${which}-p`" v-model="values[`${which}_provider`]" class="input">
            <option value="none">None (not chosen)</option>
            <template v-if="which === 'geocoding'"><option value="nominatim">Nominatim-compatible service</option></template>
            <template v-else><option value="osrm">OSRM-compatible service</option><option value="openrouteservice">openrouteservice</option></template>
          </select></div>
        <div class="field"><label :for="`mp-${which}-u`">Service address</label><input :id="`mp-${which}-u`" v-model="values[`${which}_url`]" type="url" class="input" :disabled="values[`${which}_provider`] === 'none'" /><p v-if="errors[`${which}_url`]" class="field-error">{{ errors[`${which}_url`] }}</p></div>
      </div>
      <SecretField :id="`mp-${which}-k`" v-model="secretInput[`${which}_key`]!" label="API key (if the provider needs one)" :is-set="isSet(`${which}_key`)" />
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-quiet justify-self-start" @click="test(which)"><PlugZap class="size-4" aria-hidden="true" /> Test saved {{ which }} settings</button>
        <p v-if="result[which]" class="text-sm font-semibold" :class="result[which]!.ok ? 'text-success' : 'text-danger'" :role="result[which]!.ok ? 'status' : 'alert'">{{ result[which]!.message }}</p>
      </div>
    </fieldset>
  </SettingsForm>
</template>
