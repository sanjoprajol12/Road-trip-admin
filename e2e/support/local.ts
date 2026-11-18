import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Admin E2E runs only against the local stack: the Laravel API from ../web on the local Supabase Postgres.
const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/myridenepal'
const API_URL = 'http://127.0.0.1:8010'
export const TEST_EMAIL_DOMAIN = 'e2e.test'

export function assertLocalStack() {
  const env = readFileSync(new URL('../../../web/.env', import.meta.url), 'utf8')
  const read = (k: string) => new RegExp(`^${k}=(.*)$`, 'm').exec(env)?.[1]?.trim() ?? ''
  if (read('DB_HOST') !== '127.0.0.1' || read('DB_DATABASE') !== 'myridenepal') {
    throw new Error('E2E refuses to run: ../web/.env does not point at the local myridenepal database.')
  }
}

export function sql(statement: string): string {
  return execFileSync('psql', [LOCAL_DB_URL, '-qtAc', statement], { encoding: 'utf8' }).trim()
}

export function deleteTestUsers() {
  sql(`delete from users where email like '%@${TEST_EMAIL_DOMAIN}'`)
}

/** Registers through the public API, then confirms the address in the local database. */
export async function createRider(label: string, password: string): Promise<{ id: string; email: string }> {
  const email = `${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@${TEST_EMAIL_DOMAIN}`
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ display_name: `E2E ${label}`, email, password }),
  })
  if (res.status !== 202) throw new Error(`register failed: ${res.status} ${await res.text()}`)
  const id = sql(`update users set email_verified_at = now() where email = '${email}' returning id`)
  return { id, email }
}

export const grantRole = (userId: string, role: 'moderator' | 'admin') =>
  sql(`insert into user_roles (user_id, role, granted_at) values ('${userId}', '${role}', now())`)
export const revokeRoles = (userId: string) => sql(`delete from user_roles where user_id = '${userId}'`)

export const createClaim = (userId: string, kind: string, statement: string, scope = '') =>
  sql(`insert into user_verifications (id, user_id, kind, scope, statement, created_at, updated_at)
       values (gen_random_uuid(), '${userId}', '${kind}', '${scope}', '${statement.replaceAll("'", "''")}', now(), now()) returning id`)
export const claimStatus = (id: string) => sql(`select status from user_verifications where id = '${id}'`)

export const createContribution = (authorId: string, title: string) =>
  sql(`insert into contributions (id, author_id, kind, title, body, observed_on, created_at, updated_at)
       values (gen_random_uuid(), '${authorId}', 'trip', '${title.replaceAll("'", "''")}', 'A trip write-up created by the admin E2E suite only.', current_date - 3, now(), now()) returning id`)
