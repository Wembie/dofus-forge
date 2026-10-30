import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }]]
    : 'list',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  webServer: {
    // The production Worker over dist/client, as Cloudflare serves it.
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
})
