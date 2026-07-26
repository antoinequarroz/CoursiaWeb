export const publicLegalContent = {
  version: '0.1.0',
  effectiveDate: '2026-07-25',
  references: ['COUR-43', 'COUR-44'],
  contactEmail: 'contact@coursia.local',
  documents: [
    {
      slug: 'cgu',
      title: 'Conditions générales d’utilisation',
      summary:
        'Règles d’accès au site, statut de maquette, absence de promesse commerciale définitive et usage acceptable.',
    },
    {
      slug: 'confidentialite',
      title: 'Politique de confidentialité',
      summary:
        'Données collectées, finalités, minimisation, consentement, demandes d’accès, export et suppression.',
    },
    {
      slug: 'cookies',
      title: 'Politique cookies',
      summary:
        'Cookies strictement nécessaires pendant la phase de lancement et consentement avant tout suivi non essentiel.',
    },
  ],
  dataRights: [
    'Accès aux données associées à votre email',
    'Export dans un format lisible',
    'Suppression de la liste d’attente ou des demandes de contact',
    'Retrait du consentement avant le lancement',
  ],
  traceability:
    'Toute nouvelle version devra être publiée avec un numéro de version, une date d’entrée en vigueur et une référence aux tickets de validation.',
} as const

