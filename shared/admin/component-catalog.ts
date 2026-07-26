import { coursiaDesignTokens } from '#shared/design-system/tokens'

export type ComponentCatalogItem = {
  id: string
  title: string
  productionComponent?: string
  usefulProps: string[]
  variants: string[]
  useCases: string[]
  accessibility: string[]
}

export const componentCatalogTokens = {
  colors: coursiaDesignTokens.color,
  typography: coursiaDesignTokens.typography,
  spacing: coursiaDesignTokens.spacing,
  radius: coursiaDesignTokens.radius,
  shadow: coursiaDesignTokens.shadow,
  effects: coursiaDesignTokens.effects,
} as const

export const componentCatalogItems: ComponentCatalogItem[] = [
  {
    id: 'buttons',
    title: 'Boutons',
    productionComponent: 'BaseButton',
    usefulProps: ['variant', 'size', 'disabled', 'type'],
    variants: ['primary', 'secondary', 'ghost', 'disabled', 'loading'],
    useCases: ['actions principales', 'actions secondaires', 'actions discrètes', 'actions serveur'],
    accessibility: [
      'libellé explicite',
      'état focus visible',
      'disabled uniquement si une alternative ou explication existe',
    ],
  },
  {
    id: 'links',
    title: 'Liens',
    usefulProps: ['href', 'to', 'target', 'rel', 'aria-label'],
    variants: ['interne', 'externe', 'navigation', 'ancre'],
    useCases: ['navigation admin', 'liens contrôlés documentation', 'liens de détail'],
    accessibility: ['texte compréhensible hors contexte', 'focus visible', 'rel=noreferrer en externe'],
  },
  {
    id: 'fields',
    title: 'Champs, sélecteurs, filtres et recherche',
    usefulProps: ['type', 'placeholder', 'aria-label', 'disabled', 'aria-invalid'],
    variants: ['search', 'text', 'select', 'textarea', 'error'],
    useCases: ['recherche admin', 'filtres de listes', 'formulaires serveur'],
    accessibility: ['label visible ou sr-only', 'message erreur associé', 'navigation clavier native'],
  },
  {
    id: 'cards',
    title: 'Cartes',
    productionComponent: 'BaseCard',
    usefulProps: ['glass'],
    variants: ['standard', 'glass', 'interactive', 'empty'],
    useCases: ['conteneurs de dashboard', 'blocs de formulaire', 'documentation', 'landing publique'],
    accessibility: ['hiérarchie de titres stable', 'contraste vérifié', 'pas de carte cliquable ambiguë'],
  },
  {
    id: 'badges',
    title: 'Badges',
    productionComponent: 'BaseBadge',
    usefulProps: ['tone'],
    variants: ['primary', 'success', 'warning', 'danger', 'neutral'],
    useCases: ['statuts', 'priorités', 'catégories', 'résultats de validation'],
    accessibility: ['ne pas transmettre le statut uniquement par la couleur', 'texte court lisible'],
  },
  {
    id: 'alerts',
    title: 'Alertes et confirmations',
    usefulProps: ['role', 'aria-live', 'tone'],
    variants: ['information', 'success', 'warning', 'danger'],
    useCases: ['erreurs serveur', 'confirmation de sauvegarde', 'blocants production'],
    accessibility: ['role=alert pour erreur immédiate', 'message actionnable', 'contraste suffisant'],
  },
  {
    id: 'modals',
    title: 'Modales',
    usefulProps: ['role=dialog', 'aria-modal', 'aria-labelledby'],
    variants: ['confirmation', 'danger', 'formulaire court'],
    useCases: ['confirmation suppression', 'refus modération', 'rollback critique'],
    accessibility: ['focus piégé', 'fermeture clavier', 'titre lié à la boîte de dialogue'],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    usefulProps: ['aria-label', 'aria-current', 'to'],
    variants: ['sidebar admin', 'topbar publique', 'table des matières', 'pagination'],
    useCases: ['back-office', 'documentation', 'catalogue composant', 'listes filtrées'],
    accessibility: ['ordre clavier logique', 'destination visible', 'état actif explicite'],
  },
  {
    id: 'tables',
    title: 'Tableaux, pagination et listes',
    usefulProps: ['scope', 'aria-label', 'pageSize'],
    variants: ['table desktop', 'cartes mobile', 'pagination 50 lignes', 'état vide'],
    useCases: ['recettes', 'produits', 'prix', 'utilisateurs support'],
    accessibility: ['en-têtes de colonnes', 'labels de filtres', 'volume réaliste contrôlé'],
  },
  {
    id: 'states',
    title: 'Skeletons, vide, erreur et accès refusé',
    usefulProps: ['aria-busy', 'role', 'status'],
    variants: ['loading', 'empty', 'error', 'denied', 'success'],
    useCases: ['dashboard', 'documentation', 'listes admin', 'mutations serveur'],
    accessibility: ['texte visible', 'pas de spinner seul', 'message de correction si possible'],
  },
]

export const responsivePreviewModes = [
  { id: 'mobile', label: 'Mobile', widthClass: 'max-w-sm' },
  { id: 'tablet', label: 'Tablette', widthClass: 'max-w-2xl' },
  { id: 'desktop', label: 'Desktop', widthClass: 'max-w-full' },
] as const

export const componentCatalogQualityChecklist = [
  'utiliser les composants de production quand ils existent',
  'lire les tokens depuis coursiaDesignTokens',
  'tester focus clavier et ordre de tabulation',
  'vérifier contraste en thème clair et sombre',
  'documenter loading, erreur, vide et accès refusé',
  'contrôler mobile, tablette et desktop',
] as const
