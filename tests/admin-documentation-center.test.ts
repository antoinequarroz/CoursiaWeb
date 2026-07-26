import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  adminDocumentationArticles,
  filterDocumentationArticles,
} from '../shared/admin/documentation'
import { adminNavigationSections } from '../shared/admin/dashboard'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('COUR-113 internal admin documentation center', () => {
  const page = read('app/pages/admin/documentation.vue')
  const adminMiddleware = read('app/middleware/admin-auth.global.ts')
  const nuxtConfig = read('nuxt.config.ts')
  const envExample = read('.env.example')

  it('exposes the protected /admin/documentation route with admin layout', () => {
    expect(page).toContain("layout: 'admin'")
    expect(adminMiddleware).toContain('isAdminRoute')
    expect(adminMiddleware).toContain('/api/auth/session')
    expect(adminMiddleware).toContain('/auth/login')
  })

  it('adds direct admin navigation to the documentation center', () => {
    const docsItem = adminNavigationSections
      .flatMap((section) => section.items)
      .find((item) => item.path === '/admin/documentation')

    expect(docsItem?.label).toBe('Documentation')
    expect(docsItem?.minimumRole).toBe('editor')
  })

  it('provides initial content for architecture data security subscriptions release and recipes', () => {
    expect(adminDocumentationArticles.map((article) => article.id)).toEqual([
      'architecture',
      'data-model',
      'security',
      'subscriptions',
      'release',
      'recipe-operations',
    ])

    for (const article of adminDocumentationArticles) {
      expect(article.owner).toBeTruthy()
      expect(article.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(['validé', 'à vérifier', 'brouillon']).toContain(article.status)
      expect(article.sections.length).toBeGreaterThan(0)
    }
  })

  it('supports table of contents search and operational states', () => {
    expect(filterDocumentationArticles('rollback').map((article) => article.id)).toContain('release')
    expect(filterDocumentationArticles('RevenueCat').map((article) => article.id)).toContain(
      'subscriptions',
    )
    expect(filterDocumentationArticles('RLS').map((article) => article.id)).toContain('security')

    expect(page).toContain('Table des matières')
    expect(page).toContain('Recherche procédure')
    expect(page).toContain('Chargement de la documentation')
    expect(page).toContain('Aucune procédure')
    expect(page).toContain('Impossible de charger la documentation')
    expect(page).toContain('Accès refusé')
  })

  it('keeps external links configurable and avoids sensitive identifiers in docs content', () => {
    for (const key of [
      'docsJiraUrl',
      'docsRepositoryUrl',
      'docsSupabaseUrl',
      'docsSentryUrl',
      'docsPosthogUrl',
    ]) {
      expect(nuxtConfig).toContain(key)
    }

    expect(envExample).toContain('NUXT_PUBLIC_DOCS_JIRA_URL=')
    expect(envExample).toContain('Browser-safe URLs only, no tokens')

    const serializedContent = JSON.stringify(adminDocumentationArticles)
    expect(serializedContent).not.toMatch(/service_role|password|secret|token|jwt/i)
  })

  it('keeps documentation content separate from public landing content', () => {
    const publicHome = read('app/pages/index.vue')
    const documentationContent = read('shared/admin/documentation.ts')

    expect(publicHome).not.toContain('adminDocumentationArticles')
    expect(publicHome).not.toContain('Centre de documentation Coursia')
    expect(documentationContent).toContain('adminDocumentationArticles')
  })
})
