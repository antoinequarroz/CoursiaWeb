import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { publicSeoContent } from '#shared/public-site/seo-content'
import { webQualityBudgets } from '#shared/quality/performance-budgets'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('COUR-110 performance SEO and accessibility controls', () => {
  it('pre-renders essential public pages and compresses public assets', () => {
    const nuxtConfig = read('nuxt.config.ts')

    expect(publicSeoContent.prerenderRoutes).toContain('/')
    expect(publicSeoContent.prerenderRoutes).toContain('/contact')
    expect(publicSeoContent.prerenderRoutes).toContain('/liste-attente')
    expect(nuxtConfig).toContain('compressPublicAssets: true')
    expect(nuxtConfig).toContain('routeRules')
  })

  it('defines explicit quality budgets', () => {
    expect(webQualityBudgets.publicPages.lcpMs).toBeLessThanOrEqual(2500)
    expect(webQualityBudgets.publicPages.cls).toBeLessThanOrEqual(0.1)
    expect(webQualityBudgets.publicPages.inpMs).toBeLessThanOrEqual(200)
    expect(webQualityBudgets.adminPages.maxInitialRows).toBe(50)
  })

  it('keeps keyboard navigation and reduced-motion controls visible in code', () => {
    const publicLayout = read('app/layouts/public.vue')
    const adminLayout = read('app/layouts/admin.vue')
    const css = read('app/assets/css/main.css')

    expect(publicLayout).toContain('Aller au contenu principal')
    expect(adminLayout).toContain('Aller au contenu admin')
    expect(css).toContain('focus-visible')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('content-visibility: auto')
  })

  it('documents before-after performance and accessibility evidence', () => {
    const report = read('docs/performance-accessibility-cour-110.md')

    expect(report).toContain('Mesures avant')
    expect(report).toContain('Optimisations appliquées')
    expect(report).toContain('Mesures après')
    expect(report).toContain('50 lignes')
    expect(report).toContain('Lighthouse')
  })
})
