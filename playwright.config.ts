import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3199)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npx nuxi dev --port ${port} --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: 'test',
      NUXT_PUBLIC_SITE_URL: `http://127.0.0.1:${port}`,
      NUXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'e2e-publishable-placeholder',
      NUXT_SUPABASE_SERVICE_ROLE_KEY: '',
      NUXT_E2E_BYPASS_ADMIN_AUTH: 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
