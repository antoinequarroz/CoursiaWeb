import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { publicFeatureContent } from '../shared/public-site/features-content'

describe('COUR-90 public feature and how-it-works pages', () => {
  const featuresPage = readFileSync(resolve(process.cwd(), 'app/pages/fonctionnalites.vue'), 'utf8')
  const howItWorksPage = readFileSync(
    resolve(process.cwd(), 'app/pages/comment-ca-marche.vue'),
    'utf8',
  )
  const homepage = readFileSync(resolve(process.cwd(), 'app/pages/index.vue'), 'utf8')

  it('creates the public feature and how-it-works routes with SEO metadata', () => {
    expect(featuresPage).toContain("layout: 'public'")
    expect(featuresPage).toContain('useSeoMeta')
    expect(featuresPage).toContain('ogTitle')
    expect(featuresPage).toContain('twitterCard')

    expect(howItWorksPage).toContain("layout: 'public'")
    expect(howItWorksPage).toContain('useSeoMeta')
    expect(howItWorksPage).toContain('ogTitle')
    expect(howItWorksPage).toContain('twitterCard')
  })

  it('centralizes content for features, steps and current limits', () => {
    expect(featuresPage).toContain('publicFeatureContent')
    expect(howItWorksPage).toContain('publicFeatureContent')
    expect(publicFeatureContent.features).toHaveLength(5)
    expect(publicFeatureContent.steps).toHaveLength(6)
    expect(publicFeatureContent.currentLimits.length).toBeGreaterThanOrEqual(4)
  })

  it('explains each main feature with a visual label', () => {
    for (const feature of publicFeatureContent.features) {
      expect(feature.title).toBeTruthy()
      expect(feature.description).toBeTruthy()
      expect(feature.visual).toBeTruthy()
    }

    expect(featuresPage).toContain('feature.visual')
    expect(featuresPage).toContain('feature.description')
  })

  it('makes the six-step recipe-to-savings path understandable', () => {
    const expectedSteps = [
      'Choisir ses préférences',
      'Découvrir des recettes',
      'Construire le planning',
      'Générer les courses',
      'Comparer les enseignes',
      'Suivre les économies',
    ]

    for (const step of expectedSteps) {
      expect(publicFeatureContent.steps.map((item) => item.title)).toContain(step)
    }
  })

  it('states current limits honestly and links the new pages from the landing', () => {
    expect(featuresPage).toContain('Limites actuelles')
    expect(howItWorksPage).toContain('Limites actuelles')
    expect(publicFeatureContent.currentLimits.join(' ')).toContain('maquettes')
    expect(publicFeatureContent.currentLimits.join(' ')).toContain('partenaires confirmés')

    expect(homepage).toContain('/fonctionnalites')
    expect(homepage).toContain('/comment-ca-marche')
  })

  it('keeps the new public pages responsive for mobile-first rendering', () => {
    expect(featuresPage).toContain('md:grid-cols-2')
    expect(featuresPage).toContain('lg:grid-cols-3')
    expect(howItWorksPage).toContain('md:grid-cols-2')
    expect(howItWorksPage).toContain('lg:grid-cols-3')
    expect(howItWorksPage).toContain('lg:grid-cols-[0.8fr_1.2fr]')
  })
})
