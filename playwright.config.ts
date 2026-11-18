import { defineConfig, devices } from '@playwright/test'

// Needs the local Postgres (`pnpm db:start` in ../web). Starts the Laravel API from ../web (backend only,
// nothing is imported from that repo) and this app's preview, which proxies /api to it.
// Pinned to 1.63.0 like web, to use the browser builds cached on the dev machine.
export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://127.0.0.1:4181', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'php artisan serve --host=127.0.0.1 --port=8010',
      cwd: '../web',
      url: 'http://127.0.0.1:8010/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm build-only && pnpm preview --host 127.0.0.1',
      url: 'http://127.0.0.1:4181',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
})
