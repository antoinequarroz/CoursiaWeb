import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { publicSeoContent } from './shared/public-site/seo-content'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-24',
  devtools: { enabled: true },

  modules: ['@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    supabaseServiceRoleKey: '',
    public: {
      siteUrl: 'http://localhost:3000',
      supabaseUrl: '',
      supabasePublishableKey: '',
    },
  },

  nitro: {
    prerender: {
      routes: [...publicSeoContent.prerenderRoutes, '/robots.txt', '/sitemap.xml'],
    },
  },

  routeRules: Object.fromEntries(
    publicSeoContent.prerenderRoutes.map((route) => [route, { prerender: true }]),
  ),

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
