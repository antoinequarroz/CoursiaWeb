import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('COUR-107 essential web components and forms', () => {
  const button = readFileSync(resolve(process.cwd(), 'app/components/base/BaseButton.vue'), 'utf8')
  const badge = readFileSync(resolve(process.cwd(), 'app/components/base/BaseBadge.vue'), 'utf8')
  const card = readFileSync(resolve(process.cwd(), 'app/components/base/BaseCard.vue'), 'utf8')
  const themeToggle = readFileSync(resolve(process.cwd(), 'app/components/base/ThemeToggle.vue'), 'utf8')
  const recipeForm = readFileSync(resolve(process.cwd(), 'app/pages/admin/recettes/index.vue'), 'utf8')
  const mediaForm = readFileSync(resolve(process.cwd(), 'app/pages/admin/recettes/medias.vue'), 'utf8')
  const priceForm = readFileSync(resolve(process.cwd(), 'app/pages/admin/prix.vue'), 'utf8')
  const contentForm = readFileSync(resolve(process.cwd(), 'app/pages/admin/contenus.vue'), 'utf8')

  it('covers base UI states used by admin forms', () => {
    expect(button).toContain("variant?: 'primary' | 'secondary' | 'ghost'")
    expect(button).toContain("size?: 'sm' | 'md'")
    expect(button).toContain('disabled')
    expect(button).toContain('ds-focus-ring')
    expect(badge).toContain("tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'")
    expect(card).toContain('glass')
  })

  it('covers theme switching without relying on external services', () => {
    expect(themeToggle).toContain('localStorage')
    expect(themeToggle).toContain('prefers-color-scheme')
    expect(themeToggle).toContain('document.documentElement.dataset.theme')
  })

  it('covers essential admin forms for recipes media prices and content', () => {
    expect(recipeForm).toContain('@submit.prevent')
    expect(recipeForm).toContain('Créer ou modifier')
    expect(mediaForm).toContain('altText')
    expect(mediaForm).toContain('Publier')
    expect(priceForm).toContain('amountChf')
    expect(priceForm).toContain('Historique')
    expect(contentForm).toContain('FAQ, textes marketing, liens et annonces')
    expect(contentForm).toContain('Apercu')
  })
})
