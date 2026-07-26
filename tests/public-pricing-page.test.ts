import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { publicPricingContent } from '../shared/public-site/pricing-content'

describe('COUR-91 public pricing page', () => {
  const pricingPage = readFileSync(resolve(process.cwd(), 'app/pages/tarifs.vue'), 'utf8')
  const homepage = readFileSync(resolve(process.cwd(), 'app/pages/index.vue'), 'utf8')

  it('creates the pricing route with SEO and social metadata', () => {
    expect(pricingPage).toContain("layout: 'public'")
    expect(pricingPage).toContain('useSeoMeta')
    expect(pricingPage).toContain('ogTitle')
    expect(pricingPage).toContain('twitterCard')
  })

  it('centralizes the four subscription plans from the COUR-31 matrix context', () => {
    expect(publicPricingContent.source).toBe('COUR-31')
    expect(publicPricingContent.plans.map((plan) => plan.name)).toEqual([
      'Gratuit',
      'Standard',
      'Premium',
      'Famille',
    ])
  })

  it('makes monthly prices, annual prices, features and limits comparable', () => {
    for (const plan of publicPricingContent.plans) {
      expect(typeof plan.monthlyPrice).toBe('number')
      expect(typeof plan.annualPrice).toBe('number')
      expect(plan.limits.length).toBeGreaterThan(0)
      expect(Object.keys(plan.features)).toEqual([
        'recipes',
        'planning',
        'shopping',
        'comparison',
        'budget',
        'household',
      ])
    }

    expect(publicPricingContent.comparisonRows).toHaveLength(6)
    expect(pricingPage).toContain('<table')
    expect(pricingPage).toContain('Comparaison détaillée')
  })

  it('states renewal conditions and avoids promising web purchase', () => {
    expect(publicPricingContent.renewalNotice).toContain('renouvellent automatiquement')
    expect(publicPricingContent.purchaseAvailability).toContain('L’achat web n’est pas disponible')
    expect(pricingPage).not.toContain('Acheter maintenant')
    expect(pricingPage).not.toContain('Payer en ligne')
  })

  it('does not make the recommended plan misleading and supports mobile/accessibility', () => {
    const recommendedPlans = publicPricingContent.plans.filter((plan) => plan.recommended)

    expect(recommendedPlans).toHaveLength(1)
    expect(recommendedPlans[0]?.name).toBe('Premium')
    expect(recommendedPlans[0]?.recommendationLabel).toContain('usages réguliers')
    expect(pricingPage).toContain('aria-label')
    expect(pricingPage).toContain('overflow-x-auto')
    expect(pricingPage).toContain('sr-only')
    expect(pricingPage).toContain('md:grid-cols-2')
    expect(homepage).toContain('/tarifs')
  })
})

