import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  adminDashboardIndicators,
  adminNavigationSections,
  filterAdminNavigationForRole,
} from '../shared/admin/dashboard'

describe('COUR-95 admin layout and dashboard', () => {
  const adminLayout = readFileSync(resolve(process.cwd(), 'app/layouts/admin.vue'), 'utf8')
  const adminPage = readFileSync(resolve(process.cwd(), 'app/pages/admin/index.vue'), 'utf8')
  const adminMiddleware = readFileSync(resolve(process.cwd(), 'app/middleware/admin-auth.global.ts'), 'utf8')

  it('keeps /admin protected by authentication middleware', () => {
    expect(adminMiddleware).toContain('isAdminRoute')
    expect(adminMiddleware).toContain('/api/auth/session')
    expect(adminMiddleware).toContain('/auth/login')
  })

  it('provides sidebar navigation, header, search and profile', () => {
    expect(adminLayout).toContain('COURSIA ADMIN')
    expect(adminLayout).toContain('Recherche admin')
    expect(adminLayout).toContain('Profil admin')
    expect(adminLayout).toContain('Déconnexion')
  })

  it('contains every required admin destination', () => {
    const labels = adminNavigationSections.flatMap((section) => section.items.map((item) => item.label))

    for (const label of [
      'Recettes',
      'Ingrédients',
      'Allergènes',
      'Enseignes',
      'Produits',
      'Prix',
      'Modération',
      'Utilisateurs',
      'Abonnements',
      'Contenus',
      'Paramètres',
      'Documentation',
      'Composants',
    ]) {
      expect(labels).toContain(label)
    }
  })

  it('shows role-limited navigation data', () => {
    const editorNavigation = filterAdminNavigationForRole('editor')
    const editorLabels = editorNavigation.flatMap((section) => section.items.map((item) => item.label))

    expect(editorLabels).toContain('Recettes')
    expect(editorLabels).not.toContain('Paramètres')
  })

  it('renders dashboard indicators and links to filtered lists', () => {
    expect(adminDashboardIndicators.map((indicator) => indicator.label)).toEqual([
      'Recettes',
      'Brouillons',
      'Contenus à valider',
      'Prix périmés',
      'Alertes',
    ])
    expect(adminDashboardIndicators.some((indicator) => indicator.href.includes('?status='))).toBe(true)
    expect(adminPage).toContain('Chargement du tableau de bord')
    expect(adminPage).toContain('Aucun indicateur disponible')
    expect(adminPage).toContain('Impossible de charger')
    expect(adminPage).toContain('Rafraîchir')
    expect(adminPage).toContain('md:grid-cols-2')
  })
})

