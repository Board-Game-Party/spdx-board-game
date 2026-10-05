import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e/specs',
  // Tests share one database and each one re-seeds it, so they must not run in parallel.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI, // keep test.only out of CI
  retries: process.env.CI ? 1 : 0, // few retries so flaky tests are not hidden
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  // Start the full stack (api + db + web) if it is not already running.
  webServer: {
    command: 'docker compose up',
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
