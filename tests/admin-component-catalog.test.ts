import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  componentCatalogItems,
  componentCatalogQualityChecklist,
  componentCatalogTokens,
  responsivePreviewModes,
} from '../shared/admin/component-catalog'
import { adminNavigationSections } from '../shared/admin/dashboard'
import { coursiaDesignTokens } from '../shared/design-system/tokens'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('COUR-114 internal component catalog', () => {
  const page = read('app/pages/admin/composants.vue')
  const adminMiddleware = read('app/middleware/admin-auth.global.ts')

  it('exposes the protected /admin/composants route with admin layout', () => {
    expect(page).toContain("layout: 'admin'")
    expect(adminMiddleware).toContain('isAdminRoute')
    expect(adminMiddleware).toContain('/api/auth/session')
    expect(adminMiddleware).toContain('/auth/login')
  })

  it('adds direct admin navigation to the component catalog', () => {
    const catalogItem = adminNavigationSections
      .flatMap((section) => section.items)
      .find((item) => item.path === '/admin/composants')

    expect(catalogItem?.label).toBe('Composants')
    expect(catalogItem?.minimumRole).toBe('editor')
  })

  it('uses design tokens as the source of truth', () => {
    expect(componentCatalogTokens.colors).toBe(coursiaDesignTokens.color)
    expect(componentCatalogTokens.typography).toBe(coursiaDesignTokens.typography)
    expect(componentCatalogTokens.spacing).toBe(coursiaDesignTokens.spacing)
    expect(componentCatalogTokens.radius).toBe(coursiaDesignTokens.radius)
    expect(componentCatalogTokens.shadow).toBe(coursiaDesignTokens.shadow)
    expect(componentCatalogTokens.effects).toBe(coursiaDesignTokens.effects)
    expect(page).toContain('coursiaDesignTokens')
  })

  it('documents required component families variants props and use cases', () => {
    expect(componentCatalogItems.map((item) => item.id)).toEqual([
      'buttons',
      'links',
      'fields',
      'cards',
      'badges',
      'alerts',
      'modals',
      'navigation',
      'tables',
      'states',
    ])

    for (const item of componentCatalogItems) {
      expect(item.variants.length).toBeGreaterThan(0)
      expect(item.usefulProps.length).toBeGreaterThan(0)
      expect(item.useCases.length).toBeGreaterThan(0)
      expect(item.accessibility.length).toBeGreaterThan(0)
    }
  })

  it('renders production components instead of screenshots or copied mockups', () => {
    expect(page).toContain('<BaseButton')
    expect(page).toContain('<BaseBadge')
    expect(page).toContain('<BaseCard')
    expect(page).not.toContain('<img')
    expect(page).not.toContain('screenshot')
  })

  it('supports light dark and responsive previews directly in the catalog', () => {
    expect(responsivePreviewModes.map((mode) => mode.id)).toEqual(['mobile', 'tablet', 'desktop'])
    expect(page).toContain("activeTheme = ref<CoursiaThemeName>('light')")
    expect(page).toContain("activePreview = ref")
    expect(page).toContain(':data-theme="activeTheme"')
    expect(page).toContain('activePreviewClass')
  })

  it('documents keyboard focus contrast screen reader and operational states', () => {
    expect(componentCatalogQualityChecklist).toContain('tester focus clavier et ordre de tabulation')
    expect(componentCatalogQualityChecklist).toContain('vérifier contraste en thème clair et sombre')
    expect(page).toContain('role="alert"')
    expect(page).toContain('role="status"')
    expect(page).toContain('aria-busy="true"')
    expect(page).toContain('sr-only')
    expect(page).toContain('Accès refusé')
    expect(page).toContain('Skeleton')
    expect(page).toContain('Aucun résultat')
  })
})
