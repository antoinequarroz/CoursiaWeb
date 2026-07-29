import type { AdminRole } from '#shared/auth/permissions'
import { hasAdminRole } from '#shared/auth/permissions'

export const adminNavigationSections = [
  {
    title: 'Catalogue',
    items: [
      { label: 'Recettes', path: '/admin/recettes', minimumRole: 'editor' },
      { label: 'Import recettes', path: '/admin/recettes/import', minimumRole: 'editor' },
      { label: 'Publication recettes', path: '/admin/recettes/publication', minimumRole: 'editor' },
      { label: 'Médias recettes', path: '/admin/recettes/medias', minimumRole: 'editor' },
      { label: 'Ingrédients', path: '/admin/ingredients', minimumRole: 'editor' },
      { label: 'Allergènes', path: '/admin/allergenes', minimumRole: 'editor' },
      { label: 'Correspondances', path: '/admin/correspondances', minimumRole: 'editor' },
      { label: 'Enseignes', path: '/admin/enseignes', minimumRole: 'editor' },
      { label: 'Produits', path: '/admin/produits', minimumRole: 'editor' },
      { label: 'Prix', path: '/admin/prix', minimumRole: 'editor' },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { label: 'Modération', path: '/admin/moderation', minimumRole: 'moderator' },
      { label: 'Leads', path: '/admin/leads', minimumRole: 'support' },
      { label: 'Utilisateurs', path: '/admin/utilisateurs', minimumRole: 'support' },
      { label: 'Abonnements', path: '/admin/abonnements', minimumRole: 'support' },
      { label: 'Contenus', path: '/admin/contenus', minimumRole: 'editor' },
      { label: 'Paramètres', path: '/admin/parametres', minimumRole: 'administrator' },
    ],
  },
  {
    title: 'Système',
    items: [
      { label: 'Documentation', path: '/admin/documentation', minimumRole: 'editor' },
      { label: 'Composants', path: '/admin/composants', minimumRole: 'editor' },
    ],
  },
] as const

export const adminDashboardIndicators = [
  { label: 'Recettes', value: 128, status: 'ok', href: '/admin/recettes' },
  { label: 'Brouillons', value: 14, status: 'warning', href: '/admin/recettes?status=draft' },
  { label: 'Contenus à valider', value: 7, status: 'warning', href: '/admin/contenus?status=review' },
  { label: 'Prix périmés', value: 23, status: 'danger', href: '/admin/prix?status=stale' },
  { label: 'Alertes', value: 4, status: 'danger', href: '/admin/moderation' },
] as const

type AdminNavigationRole = (typeof adminNavigationSections)[number]['items'][number]['minimumRole']

export const filterAdminNavigationForRole = (role: AdminRole | null | undefined) => {
  return adminNavigationSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => hasAdminRole(role, item.minimumRole as AdminNavigationRole)),
  }))
}
