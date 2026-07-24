import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('public homepage landing page', () => {
  const homepage = readFileSync(resolve(process.cwd(), 'app/pages/index.vue'), 'utf8')

  it('is the public route and declares SEO/social metadata', () => {
    expect(homepage).toContain("layout: 'public'")
    expect(homepage).toContain('useSeoMeta')
    expect(homepage).toContain('ogTitle')
    expect(homepage).toContain('twitterCard')
  })

  it('contains the required landing sections and CTA', () => {
    expect(homepage).toContain('id="problem"')
    expect(homepage).toContain('id="solution"')
    expect(homepage).toContain('id="how-it-works"')
    expect(homepage).toContain('id="features"')
    expect(homepage).toContain('id="benefits"')
    expect(homepage).toContain('id="contact"')
    expect(homepage).toContain('Rejoindre la liste d’attente')
  })

  it('explains Swiss positioning, multi-store comparison and mockup status', () => {
    expect(homepage).toContain('enseignes suisses')
    expect(homepage).toContain('comparaison multi-enseignes')
    expect(homepage).toContain('Maquette produit')
    expect(homepage).toContain('Aucun chiffre de traction ni partenariat')
  })

  it('uses the recipe-to-table Coursia design direction', () => {
    expect(homepage).toContain('Votre copilote du quotidien')
    expect(homepage).toContain('De la recette')
    expect(homepage).toContain('Recettes')
    expect(homepage).toContain('Planning')
    expect(homepage).toContain('Courses')
    expect(homepage).toContain('Foyer')
  })

  it('provides navigation to pricing, FAQ, contact and legal pages', () => {
    expect(homepage).toContain('#pricing')
    expect(homepage).toContain('#faq')
    expect(homepage).toContain('#contact')
    expect(homepage).toContain('/legal')
  })
})
