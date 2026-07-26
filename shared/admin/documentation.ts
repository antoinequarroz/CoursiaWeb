export type DocumentationStatus = 'validé' | 'à vérifier' | 'brouillon'

export type DocumentationArticle = {
  id: string
  title: string
  summary: string
  owner: string
  lastVerifiedAt: string
  status: DocumentationStatus
  tags: string[]
  sections: {
    title: string
    body: string
    checklist?: string[]
  }[]
}

export const adminDocumentationArticles: DocumentationArticle[] = [
  {
    id: 'architecture',
    title: 'Architecture générale',
    summary: 'Vue d’ensemble mobile, web Nuxt, routes serveur et Supabase.',
    owner: 'Tech Lead',
    lastVerifiedAt: '2026-07-26',
    status: 'validé',
    tags: ['architecture', 'mobile', 'web', 'supabase'],
    sections: [
      {
        title: 'Composants principaux',
        body: 'Coursia sépare l’application mobile, le site public, l’administration web et Supabase. Le web Nuxt expose les pages publiques, les routes serveur Nitro et le back-office protégé.',
      },
      {
        title: 'Frontières de responsabilité',
        body: 'Le navigateur utilise uniquement les clés publiques. Les opérations sensibles passent par des routes serveur qui valident la session, le rôle, la ressource et les données.',
      },
    ],
  },
  {
    id: 'data-model',
    title: 'Modèle de données catalogue',
    summary: 'Flux recettes, ingrédients, allergènes, enseignes, produits et prix.',
    owner: 'Product Engineering',
    lastVerifiedAt: '2026-07-26',
    status: 'à vérifier',
    tags: ['recettes', 'ingrédients', 'prix', 'catalogue'],
    sections: [
      {
        title: 'Recettes et ingrédients',
        body: 'Les recettes officielles possèdent des états de publication, des étapes, des portions, des médias et des ingrédients canoniques liés à des unités contrôlées.',
      },
      {
        title: 'Produits et prix',
        body: 'Les enseignes, produits, formats et historiques de prix alimentent le comparateur. Les variations anormales et prix périmés doivent rester visibles avant publication.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Authentification, rôles et RLS',
    summary: 'Sessions admin, matrice de permissions, RLS et opérations serveur sensibles.',
    owner: 'Security Owner',
    lastVerifiedAt: '2026-07-26',
    status: 'à vérifier',
    tags: ['auth', 'roles', 'rls', 'sécurité'],
    sections: [
      {
        title: 'Accès admin',
        body: 'Les routes /admin exigent une session Supabase et un rôle autorisé. Les bypass E2E sont refusés en production.',
      },
      {
        title: 'Opérations sensibles',
        body: 'Les mutations critiques ne doivent pas être exécutées directement depuis le client. Elles passent par des routes serveur avec validation partagée et audit.',
        checklist: [
          'vérifier session et rôle',
          'valider le payload',
          'contrôler la ressource ciblée',
          'journaliser les actions importantes',
        ],
      },
    ],
  },
  {
    id: 'subscriptions',
    title: 'RevenueCat et abonnements',
    summary: 'Synchronisation des paliers, événements utiles et support utilisateur.',
    owner: 'Growth Engineering',
    lastVerifiedAt: '2026-07-26',
    status: 'brouillon',
    tags: ['revenuecat', 'abonnements', 'support'],
    sections: [
      {
        title: 'Source de vérité',
        body: 'RevenueCat reste la source des événements d’abonnement. L’administration affiche uniquement les informations nécessaires au support.',
      },
      {
        title: 'Support',
        body: 'Les vues support masquent les données sensibles et n’ajoutent pas d’impersonation par défaut.',
      },
    ],
  },
  {
    id: 'release',
    title: 'Déploiement, rollback et Definition of Done',
    summary: 'Procédure de promotion, validation production, rollback et critères de sortie.',
    owner: 'Release Manager',
    lastVerifiedAt: '2026-07-26',
    status: 'validé',
    tags: ['déploiement', 'rollback', 'dod', 'production'],
    sections: [
      {
        title: 'Promotion',
        body: 'Une release passe par CI, preview, validation Supabase, release:check, puis promotion du même commit en production.',
      },
      {
        title: 'Definition of Done',
        body: 'Typecheck, lint, tests, build, E2E, contrôle des valeurs sensibles et recette manuelle doivent être verts avant go-live.',
      },
    ],
  },
  {
    id: 'recipe-operations',
    title: 'Créer, valider, publier ou retirer une recette',
    summary: 'Guide opératoire pour les contenus recette et médias associés.',
    owner: 'Content Operations',
    lastVerifiedAt: '2026-07-26',
    status: 'validé',
    tags: ['recettes', 'publication', 'contenu', 'médias'],
    sections: [
      {
        title: 'Création',
        body: 'Créer la recette en brouillon, renseigner les champs structurés, lier ingrédients et média, puis utiliser la prévisualisation avant publication.',
      },
      {
        title: 'Retrait',
        body: 'Dépublier ou archiver selon le cas. Les suppressions définitives restent réservées aux rôles appropriés et doivent être auditées.',
      },
    ],
  },
]

export const documentationStatusLabels: Record<DocumentationStatus, string> = {
  validé: 'Validé',
  'à vérifier': 'À vérifier',
  brouillon: 'Brouillon',
}

export const documentationSearchIndex = adminDocumentationArticles.map((article) => ({
  id: article.id,
  text: [
    article.title,
    article.summary,
    article.owner,
    article.status,
    ...article.tags,
    ...article.sections.flatMap((section) => [
      section.title,
      section.body,
      ...(section.checklist ?? []),
    ]),
  ].join(' ').toLowerCase(),
}))

export const filterDocumentationArticles = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return adminDocumentationArticles
  }

  const matchingIds = documentationSearchIndex
    .filter((entry) => entry.text.includes(normalizedQuery))
    .map((entry) => entry.id)

  return adminDocumentationArticles.filter((article) => matchingIds.includes(article.id))
}
