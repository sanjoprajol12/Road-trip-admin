import { defineConfig, devices } from '@playwright/test';

// This app talks to the API over HTTP only. E2E needs an API already running against the isolated
// myridenepal_e2e database (in the backend project: `npm run build && npm run start:e2e`).
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:4001';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4274', trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4274',
    env: { API_TARGET: apiUrl },
    reuseExistingServer: !process.env.CI,
  },
});
