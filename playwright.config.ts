import { defineConfig, devices } from '@playwright/test'

// Staff portal E2E against the local stack. Needs the local Postgres + Mailpit (`pnpm db:start` in ../web) and the
// isolated database myridenepal_e2e (see ../web/docs/architecture/DEVELOPMENT_SETUP.md).
// Starts its own Laravel API from ../web (backend only, nothing is imported from that repo) on E2E_API_PORT
// (default 8011, so a developer's `composer dev` on :8010, which uses the development database, is never reused)
// and this app's preview on :4181. Emails link to ADMIN_URL for staff invitations.
// @playwright/test is pinned to 1.63.0 to match the browser builds cached on the dev machine.
const API_PORT = process.env.E2E_API_PORT ?? '8011'
const API = `http://127.0.0.1:${API_PORT}`
const ADMIN = 'http://127.0.0.1:4181'

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: ADMIN, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: `php artisan serve --host=127.0.0.1 --port=${API_PORT}`,
      cwd: '../web',
      env: {
        DB_DATABASE: 'myridenepal_e2e',
        APP_URL: 'http://127.0.0.1:4180',
        ADMIN_URL: ADMIN,
        API_PER_MINUTE: '5000', // every test browser shares 127.0.0.1
        SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:4180,localhost:4180,127.0.0.1:4181,localhost:4181',
      },
      url: `${API}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm build-only && pnpm preview --host 127.0.0.1',
      env: { API_TARGET: API },
      url: ADMIN,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
