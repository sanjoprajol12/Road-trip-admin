import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Staff portal E2E runs only against the local stack: the Laravel API from ../web (backend only, nothing is
// imported from that repo) on the local Postgres, in the isolated database myridenepal_e2e (never the development
// database myridenepal). The guard makes sure an API .env pointing anywhere else never receives test writes.
export const E2E_DATABASE = 'myridenepal_e2e'
export const LOCAL_DB_URL = `postgresql://postgres:postgres@127.0.0.1:54322/${E2E_DATABASE}`
export const MAILPIT_URL = 'http://127.0.0.1:54324'
export const API_URL = `http://127.0.0.1:${process.env.E2E_API_PORT ?? '8011'}`
export const TEST_EMAIL_DOMAIN = 'e2e.test'

export function assertLocalStack() {
  const env = readFileSync(new URL('../../../web/.env', import.meta.url), 'utf8')
  const read = (k: string) => new RegExp(`^${k}=(.*)$`, 'm').exec(env)?.[1]?.trim() ?? ''
  if (read('DB_HOST') !== '127.0.0.1' || read('DB_PORT') !== '54322') {
    throw new Error('E2E refuses to run: ../web/.env does not point at the local Postgres.')
  }
}

export function sql(statement: string): string {
  return execFileSync('psql', [LOCAL_DB_URL, '-qtAc', statement], { encoding: 'utf8' }).trim()
}

/** Removes every account the E2E suites created, rider and staff (their trips, contributions and claims cascade). */
export function deleteTestUsers() {
  sql(`delete from users where email like '%@${TEST_EMAIL_DOMAIN}'`)
  sql(`delete from staff_accounts where email like '%@${TEST_EMAIL_DOMAIN}'`)
}

/** Registers through the public API, then confirms the address directly in the local database. */
export async function createConfirmedRider(label: string, password: string, username?: string): Promise<{ id: string; email: string }> {
  const email = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_EMAIL_DOMAIN}`
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ display_name: `E2E ${label}`, email, password }),
  })
  if (res.status !== 202) throw new Error(`register failed: ${res.status} ${await res.text()}`)
  const id = sql(`update users set email_verified_at = now()${username ? `, username = '${username}'` : ''} where email = '${email}' returning id`)
  return { id, email }
}

/** Polls the local mail catcher for the newest email to `to` and returns the confirmation or reset link in it. */
export async function authLinkFromEmail(to: string, type: 'signup' | 'recovery' | 'invitation', timeoutMs = 15_000): Promise<string> {
  const pattern = {
    signup: /https?:\/\/[^\s"'<>)]+\/api\/v1\/auth\/verify-email\/[^\s"'<>)]+/,
    recovery: /https?:\/\/[^\s"'<>)]+\/reset-password\?[^\s"'<>)]+/,
    invitation: /https?:\/\/[^\s"'<>)]+\/accept-invitation\?[^\s"'<>)]+/,
  }[type]
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const search = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`).then((r) => r.json())
    for (const m of search.messages ?? []) {
      const msg = await fetch(`${MAILPIT_URL}/api/v1/message/${m.ID}`).then((r) => r.json())
      const link = pattern.exec(`${msg.Text}\n${msg.HTML}`)?.[0]?.replaceAll('&amp;', '&')
      if (link) return link
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No ${type} email for ${to} within ${timeoutMs} ms`)
}

/** Staff-suite helper: a confirmed rider without a username. */
export const createRider = (label: string, password: string) => createConfirmedRider(label, password)

/** Argon2id hash made by PHP itself (the hash Laravel checks), so test staff accounts sign in like real ones. */
function hashPassword(password: string): string {
  return execFileSync('php', ['-r', 'echo password_hash($argv[1], PASSWORD_ARGON2ID);', password], { encoding: 'utf8' }).trim()
}

/**
 * A staff account (separate from rider accounts) with one role, as an invitation would create it. Test staff use the
 * same E2E email domain, so global setup removes them too.
 */
export function createStaff(label: string, password: string, role: string): { id: string; email: string } {
  const email = `staff-${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_EMAIL_DOMAIN}`
  const id = sql(`insert into staff_accounts (id, email, display_name, password, created_at, updated_at)
                  values (gen_random_uuid(), '${email}', 'E2E ${label.replaceAll("'", "''")}', '${hashPassword(password)}', now(), now()) returning id`)
  sql(`insert into staff_account_roles (staff_account_id, role, granted_at) values ('${id}', '${role}', now())`)
  return { id, email }
}
export const revokeStaffRoles = (staffId: string) => sql(`delete from staff_account_roles where staff_account_id = '${staffId}'`)

export const createClaim = (userId: string, kind: string, statement: string, scope = '') =>
  sql(`insert into user_verifications (id, user_id, kind, scope, statement, created_at, updated_at)
       values (gen_random_uuid(), '${userId}', '${kind}', '${scope}', '${statement.replaceAll("'", "''")}', now(), now()) returning id`)
export const claimStatus = (id: string) => sql(`select status from user_verifications where id = '${id}'`)

export const createContribution = (authorId: string, title: string) =>
  sql(`insert into contributions (id, author_id, kind, title, body, observed_on, created_at, updated_at)
       values (gen_random_uuid(), '${authorId}', 'trip', '${title.replaceAll("'", "''")}', 'A trip write-up created by the admin E2E suite only.', current_date - 3, now(), now()) returning id`)
