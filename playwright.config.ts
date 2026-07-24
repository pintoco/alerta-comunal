import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // /login (not /api/health): the health endpoint queries the DB, and these
        // smoke tests deliberately don't depend on one being reachable.
        command: 'npm run start',
        url: 'http://localhost:3000/login',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
})
