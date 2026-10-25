import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',                // picks up BOTH files; each pipeline job runs its own by name
  timeout: 60_000,                 // cap for EACH test: generous for the e2e, plenty for the api requests
  expect: { timeout: 15_000 },     // cap for EACH assertion: it does not inherit the one above (default is 5 s)
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',   // the FRONT. The api has its own: API_BASE_URL, read by api.spec.js
    trace: 'on-first-retry',         // the trace is recorded on the retry of a failure (green runs don't make one)
    screenshot: 'only-on-failure',   // standalone screenshot of each failure in the report
    reducedMotion: 'reduce',         // the home cards float forever; asking for less motion keeps them still to click
  },
  retries: 1,                      // 1 retry: absorbs a one-off delay; a test that only passes there shows as «flaky»
  reporter: [['html', { open: 'never' }], ['list']],
})
