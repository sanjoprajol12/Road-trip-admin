<script setup lang="ts">
import { ref } from 'vue'
import { Mail, PlugZap } from 'lucide-vue-next'
import SettingsForm from '../components/SettingsForm.vue'
import SecretField from '../components/SecretField.vue'
import { useSettingsGroup } from '../composables/useSettingsGroup'
import { sendTestMail, testMailConnection, type ProbeResult } from '../services/settings'

const s = useSettingsGroup('mail', ['password'])
const { values, errors, secretInput } = s
const result = ref<ProbeResult | null>(null)
const busy = ref(false)
async function run(fn: () => Promise<ProbeResult>) {
  busy.value = true
  result.value = await fn()
  busy.value = false
}
</script>

<template>
  <SettingsForm title="Mail" intro="Outgoing email (confirmations, password resets, invitations). Off: the server's own configuration is used. On: these values replace it. Save before testing." :state="s" save-label="Save mail settings">
    <label class="flex items-center gap-2 text-sm font-semibold"><input v-model="values.override" type="checkbox" /> Use these SMTP settings</label>
    <div class="grid gap-4 sm:grid-cols-[1fr_8rem_10rem]">
      <div class="field"><label for="m-host">SMTP server</label><input id="m-host" v-model="values.host" class="input" placeholder="smtp.example.com" :aria-invalid="!!errors.host" /><p v-if="errors.host" class="field-error">{{ errors.host }}</p></div>
      <div class="field"><label for="m-port">Port</label><input id="m-port" v-model.number="values.port" type="number" min="1" max="65535" class="input" /><p v-if="errors.port" class="field-error">{{ errors.port }}</p></div>
      <div class="field"><label for="m-enc">Encryption</label><select id="m-enc" v-model="values.encryption" class="input"><option value="tls">STARTTLS</option><option value="ssl">SSL/TLS</option><option value="none">None (local only)</option></select></div>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="field"><label for="m-user">User name</label><input id="m-user" v-model="values.username" class="input" autocomplete="off" /></div>
      <SecretField id="m-pass" v-model="secretInput.password!" label="Password" :is-set="!!(values.password as { set?: boolean } | undefined)?.set" :error="errors.password" />
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="field"><label for="m-from">Sender address</label><input id="m-from" v-model="values.from_address" type="email" class="input" :aria-invalid="!!errors.from_address" /><p v-if="errors.from_address" class="field-error">{{ errors.from_address }}</p></div>
      <div class="field"><label for="m-name">Sender name</label><input id="m-name" v-model="values.from_name" class="input" maxlength="100" /></div>
    </div>
    <template #actions>
      <button type="button" class="btn btn-quiet" :disabled="busy" @click="run(testMailConnection)"><PlugZap class="size-4" aria-hidden="true" /> Test connection</button>
      <button type="button" class="btn btn-quiet" :disabled="busy" @click="run(sendTestMail)"><Mail class="size-4" aria-hidden="true" /> Send me a test email</button>
    </template>
    <template #after>
      <p v-if="result" class="rounded-md border border-line bg-surface p-4 text-sm font-semibold" :class="result.ok ? 'text-success' : 'text-danger'" :role="result.ok ? 'status' : 'alert'">{{ result.message }}</p>
    </template>
  </SettingsForm>
</template>
