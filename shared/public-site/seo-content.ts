export const publicSeoContent = {
  siteName: 'Coursia',
  defaultTitle: 'Coursia — Votre copilote du quotidien',
  defaultDescription:
    'Coursia aide les foyers à planifier les repas, préparer les courses et comparer les enseignes sans collecte excessive.',
  defaultSocialImage: '/social/coursia-og.svg',
  publicRoutes: [
    '/',
    '/fonctionnalites',
    '/comment-ca-marche',
    '/tarifs',
    '/faq',
    '/contact',
    '/liste-attente',
    '/legal',
    '/legal/cgu',
    '/legal/confidentialite',
    '/legal/cookies',
    '/support',
  ],
  prerenderRoutes: [
    '/',
    '/fonctionnalites',
    '/comment-ca-marche',
    '/tarifs',
    '/faq',
    '/contact',
    '/liste-attente',
    '/legal',
    '/legal/cgu',
    '/legal/confidentialite',
    '/legal/cookies',
    '/support',
  ],
  posthogEvents: [
    'public_page_view',
    'waitlist_submit',
    'contact_submit',
    'pricing_plan_interest',
    'app_download_intent',
  ],
  consentMode:
    'PostHog et tout analytics non essentiel doivent rester désactivés tant que le consentement applicable n’est pas donné.',
  qualityChecklist: [
    'Titres et descriptions uniques',
    'Canonical via siteUrl runtime',
    'Sitemap et robots générés côté serveur',
    'Open Graph et cartes sociales avec visuel Coursia',
    'Pages publiques importantes rendues SSR ou pré-rendues',
    'Core Web Vitals contrôlés au build et via Lighthouse avant production',
    'Accessibilité contrôlée par sémantique HTML, labels et navigation clavier',
  ],
} as const

export const buildCanonicalUrl = (siteUrl: string, path: string) => {
  const normalizedBase = siteUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${normalizedBase}${normalizedPath}`
}
