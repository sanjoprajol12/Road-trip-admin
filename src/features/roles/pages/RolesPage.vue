<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Lock, Plus } from 'lucide-vue-next'
import StatusLine from '@/components/ui/StatusLine.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useStaff } from '@/features/authentication/staffAccess'
import PasswordConfirmDialog from '@/components/ui/PasswordConfirmDialog.vue'
import { errorMessage, fieldErrors } from '@/lib/api/client'
import { deleteRole, listPermissions, listRoles, saveRole } from '../services/roles'
import { usePasswordConfirm } from '@/lib/usePasswordConfirm'
import type { PermissionRow, RoleRow } from '@/types/api'

// Roles are built from permissions defined in the API's code. The server refuses any permission you do not
// hold yourself, the administrator role always has everything, and built-in roles cannot be deleted.
const { can, refresh } = useStaff()
const pw = usePasswordConfirm()
const roles = ref<RoleRow[]>([])
const permissions = ref<PermissionRow[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const done = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [r, p] = await Promise.all([listRoles(), listPermissions()])
    roles.value = r
    permissions.value = p
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const modules = computed(() => {
  const groups = new Map<string, PermissionRow[]>()
  for (const p of permissions.value) groups.set(p.module, [...(groups.get(p.module) ?? []), p])
  return [...groups.entries()]
})

const editor = reactive({ open: false, slug: '' as string, name: '', description: '', permissions: [] as string[], system: false, busy: false })
const errors = ref<Record<string, string>>({})
const editError = ref<string | null>(null)
const isAdminRole = computed(() => editor.slug === 'admin')

function edit(r: RoleRow | null) {
  errors.value = {}
  editError.value = null
  Object.assign(editor, r
    ? { open: true, slug: r.slug, name: r.name, description: r.description ?? '', permissions: [...r.permissions], system: r.is_system }
    : { open: true, slug: '', name: '', description: '', permissions: [], system: false })
}

async function save() {
  editor.busy = true
  errors.value = {}
  editError.value = null
  const body = { name: editor.name.trim(), description: editor.description.trim() || null, permissions: editor.permissions }
  try {
    await pw.run(() => saveRole(editor.slug, body))
    done.value = `Role "${body.name}" saved.`
    editor.open = false
    await Promise.all([load(), refresh()])
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) editError.value = errorMessage(e)
  } finally {
    editor.busy = false
  }
}

const deleting = ref<RoleRow | null>(null)
async function remove() {
  if (!deleting.value) return
  const r = deleting.value
  error.value = null
  try {
    await pw.run(() => deleteRole(r.slug))
    done.value = `Role "${r.name}" deleted.`
    await load()
  } catch (e) {
    done.value = null
    error.value = errorMessage(e)
  } finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="px-4 py-8 sm:px-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="display text-4xl">Roles</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted">A role is a named set of permissions. People can have several roles; their rights add up. Changes apply on their next request and are kept in the audit log.</p>
      </div>
      <button v-if="can('roles.manage')" type="button" class="btn btn-primary" @click="edit(null)"><Plus class="size-4" aria-hidden="true" /> New role</button>
    </div>
    <p v-if="done" class="mt-4 text-sm text-success" role="status">{{ done }}</p>

    <StatusLine v-if="loading" state="loading" />
    <StatusLine v-else-if="error" state="error" :message="error" @retry="load">Roles could not be loaded or changed.</StatusLine>
    <ul v-if="!loading && roles.length" class="mt-6 grid max-w-3xl border-t border-line" aria-label="Roles">
      <li v-for="r in roles" :key="r.slug" class="flex flex-wrap items-start justify-between gap-3 border-b border-line py-4">
        <div class="grid gap-1">
          <span class="flex items-center gap-2 font-semibold">{{ r.name }}<span v-if="r.is_system" class="label inline-flex items-center gap-1 text-muted"><Lock class="size-3" aria-hidden="true" /> built-in</span></span>
          <span v-if="r.description" class="text-sm text-muted">{{ r.description }}</span>
          <span class="text-xs text-muted">{{ r.slug === 'admin' ? 'Every permission' : `${r.permissions.length} ${r.permissions.length === 1 ? 'permission' : 'permissions'}` }} · {{ r.members }} {{ r.members === 1 ? 'person' : 'people' }}</span>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Edit role ${r.name}`" @click="edit(r)">{{ r.slug === 'admin' ? 'View' : 'Edit' }}</button>
          <button v-if="!r.is_system" type="button" class="btn btn-quiet min-h-9 px-3 text-sm" :aria-label="`Delete role ${r.name}`" @click="deleting = r">Delete</button>
        </div>
      </li>
    </ul>

    <section v-if="editor.open" class="mt-10 max-w-3xl rounded-md border border-line bg-surface p-5" aria-labelledby="ed-title">
      <h2 id="ed-title" class="text-xl font-semibold">{{ editor.slug ? `Role: ${editor.name}` : 'New role' }}</h2>
      <p v-if="isAdminRole" class="mt-2 text-sm text-muted">The administrator role always has every permission, including ones added later. It cannot be changed.</p>
      <form class="mt-4 grid gap-5" novalidate @submit.prevent="save">
        <p v-if="editError" class="rounded-md border border-danger/40 bg-crimson-wash px-4 py-3 text-sm text-danger" role="alert">{{ editError }}</p>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="field">
            <label for="rn">Name</label>
            <input id="rn" v-model="editor.name" class="input" maxlength="60" :disabled="editor.system" :aria-invalid="!!errors.name" />
            <p v-if="errors.name" class="field-error">{{ errors.name }}</p>
          </div>
          <div class="field">
            <label for="rd">Description <span class="font-normal text-muted">(optional)</span></label>
            <input id="rd" v-model="editor.description" class="input" maxlength="300" :disabled="isAdminRole" />
          </div>
        </div>
        <p v-if="errors.permissions" class="field-error" role="alert">{{ errors.permissions }}</p>
        <fieldset v-for="[mod, perms] in modules" :key="mod" class="grid gap-2" :disabled="isAdminRole">
          <legend class="label text-muted">{{ mod.replaceAll('.', ' / ').replaceAll('_', ' ') }}</legend>
          <label v-for="p in perms" :key="p.key" class="flex items-start gap-2 text-sm">
            <input v-model="editor.permissions" type="checkbox" class="mt-1" :value="p.key" />
            <span><span class="font-semibold">{{ p.action.replaceAll('_', ' ') }}</span> <span class="text-muted">{{ p.description }}</span></span>
          </label>
        </fieldset>
        <div class="flex gap-2">
          <button v-if="!isAdminRole" type="submit" class="btn btn-primary" :disabled="editor.busy || editor.name.trim().length < 3" :aria-busy="editor.busy">{{ editor.busy ? 'Saving…' : 'Save role' }}</button>
          <button type="button" class="btn btn-quiet" @click="editor.open = false">Close</button>
        </div>
      </form>
    </section>

    <ConfirmDialog :open="!!deleting" :title="deleting ? `Delete role ${deleting.name}?` : ''" confirm-label="Delete role" danger @confirm="remove" @cancel="deleting = null">
      Only roles nobody has can be deleted. This cannot be undone, but you can create the role again.
    </ConfirmDialog>

    <PasswordConfirmDialog :pw="pw" reason="Changing roles needs your staff password again." />
  </div>
</template>
