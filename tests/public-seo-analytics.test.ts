import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canTrackPublicEvent, posthogAnalyticsPlan } from '../shared/analytics/posthog-plan'
import { buildCanonicalUrl, publicSeoContent } from '../shared/public-site/seo-content'

describe('COUR-94 SEO social analytics and public rendering', () => {
  const nuxtConfig = readFileSync(resolve(process.cwd(), 'nuxt.config.ts'), 'utf8')
  const robotsRoute = readFileSync(resolve(process.cwd(), 'server/routes/robots.txt.get.ts'), 'utf8')
  const sitemapRoute = readFileSync(resolve(process.cwd(), 'server/routes/sitemap.xml.get.ts'), 'utf8')
  const socialImage = readFileSync(resolve(process.cwd(), 'public/social/coursia-og.svg'), 'utf8')

  it('centralizes titles descriptions canonical sitemap and robots configuration', () => {
    expect(publicSeoContent.defaultTitle).toContain('Coursia')
    expect(publicSeoContent.defaultDescription).toContain('collecte excessive')
    expect(buildCanonicalUrl('https://coursia.app/', '/tarifs')).toBe('https://coursia.app/tarifs')
    expect(robotsRoute).toContain('Sitemap:')
    expect(robotsRoute).toContain('Disallow: /admin')
    expect(sitemapRoute).toContain('publicRoutes')
  })

  it('uses a Coursia social visual for Open Graph and cards', () => {
    expect(publicSeoContent.defaultSocialImage).toBe('/social/coursia-og.svg')
    expect(socialImage).toContain('Coursia')
    expect(socialImage).toContain('#ff7a59')
  })

  it('pre-renders important public pages', () => {
    expect(publicSeoContent.prerenderRoutes).toContain('/')
    expect(publicSeoContent.prerenderRoutes).toContain('/tarifs')
    expect(publicSeoContent.prerenderRoutes).toContain('/legal/confidentialite')
    expect(nuxtConfig).toContain('prerender')
    expect(nuxtConfig).toContain('routeRules')
  })

  it('connects essential events to a consent-aware PostHog plan', () => {
    expect(posthogAnalyticsPlan.provider).toBe('PostHog')
    expect(posthogAnalyticsPlan.enabledByDefault).toBe(false)
    expect(posthogAnalyticsPlan.consentRequired).toBe(true)
    expect(posthogAnalyticsPlan.events).toContain('waitlist_submit')
    expect(posthogAnalyticsPlan.payloadPolicy.forbiddenFields).toContain('email')
    expect(canTrackPublicEvent(false)).toBe(false)
    expect(canTrackPublicEvent(true)).toBe(true)
  })

  it('documents Core Web Vitals and accessibility controls', () => {
    expect(publicSeoContent.qualityChecklist.join(' ')).toContain('Core Web Vitals')
    expect(publicSeoContent.qualityChecklist.join(' ')).toContain('Accessibilité')
  })
})

