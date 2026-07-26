import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      NUXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      NUXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-placeholder',
      NUXT_SUPABASE_SERVICE_ROLE_KEY: '',
    },
  },
})
