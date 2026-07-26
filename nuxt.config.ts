import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { publicSeoContent } from './shared/public-site/seo-content'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

const sentrySourceMapsEnabled = process.env.NUXT_SENTRY_SOURCEMAPS === 'true'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-24',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    supabaseServiceRoleKey: '',
    sentryDsn: '',
    sentryEnvironment: process.env.NUXT_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    sentryRelease: process.env.NUXT_SENTRY_RELEASE || '',
    sentrySourceMaps: sentrySourceMapsEnabled,
    public: {
      siteUrl: 'http://localhost:3000',
      supabaseUrl: '',
      supabasePublishableKey: '',
      sentryEnvironment:
        process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      sentryRelease: process.env.NUXT_PUBLIC_SENTRY_RELEASE || '',
      docsJiraUrl: process.env.NUXT_PUBLIC_DOCS_JIRA_URL || 'https://hedsdev2025.atlassian.net',
      docsRepositoryUrl: process.env.NUXT_PUBLIC_DOCS_REPOSITORY_URL || '',
      docsSupabaseUrl: process.env.NUXT_PUBLIC_DOCS_SUPABASE_URL || '',
      docsSentryUrl: process.env.NUXT_PUBLIC_DOCS_SENTRY_URL || '',
      docsPosthogUrl: process.env.NUXT_PUBLIC_DOCS_POSTHOG_URL || '',
    },
  },

  sourcemap: {
    client: sentrySourceMapsEnabled,
    server: sentrySourceMapsEnabled,
  },

  nitro: {
    compressPublicAssets: true,
    prerender: {
      routes: [...publicSeoContent.prerenderRoutes, '/robots.txt', '/sitemap.xml'],
    },
  },

  routeRules: {
    '/**': { headers: securityHeaders },
    ...Object.fromEntries(
      publicSeoContent.prerenderRoutes.map((route) => [
        route,
        { prerender: true, headers: securityHeaders },
      ]),
    ),
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  alias: {
    '#app-root': fileURLToPath(new URL('./app', import.meta.url)),
    '#admin': fileURLToPath(new URL('./app/admin', import.meta.url)),
    '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
  },

  vite: {
    plugins: [tailwindcss()],
  },
})
