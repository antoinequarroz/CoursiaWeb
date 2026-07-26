# COUR-110 — Performance, SEO technique et accessibilité

Date : 2026-07-26

## Objectif

Garantir un site public rapide et un back-office utilisable, avec des seuils explicites et vérifiables.

## Mesures avant

- Build Nuxt complet avant optimisation COUR-110 : OK.
- E2E Playwright avant optimisation : 4 parcours OK.
- Les pages publiques importantes étaient déjà SSR ou pré-rendues, sauf `contact` et `liste-attente`.
- Les listes admin rendaient potentiellement toutes les lignes retournées par API.
- Le focus était présent via composants, mais pas garanti globalement sur tous les liens/champs natifs.

## Optimisations appliquées

- Pré-rendu ajouté pour `/contact` et `/liste-attente`.
- Compression des assets publics Nitro activée.
- Headers de durcissement conservés sur toutes les routes.
- Skip links publics et admin ajoutés.
- Focus visible global pour liens, boutons, inputs, selects et textareas.
- Respect `prefers-reduced-motion` maintenu pour animations décoratives.
- `contain` et `content-visibility` ajoutés pour réduire le coût de rendu des éléments décoratifs/sections longues.
- Pagination front-end des listes admin lourdes avec budget de 50 lignes initiales.

## Budgets retenus

- LCP public : ≤ 2.5 s
- CLS public : ≤ 0.1
- INP public : ≤ 200 ms
- JS public gzip cible : ≤ 180 kB par page critique
- Tables admin : 50 lignes rendues par page avant pagination/filtre

## Mesures après

- `npm run typecheck` : OK.
- `npm run lint` : OK.
- `npm test` : 150 tests OK.
- `npm run ci:secrets` : OK.
- `npm run build` : OK, 14 routes publiques pré-rendues et 26 sorties avec payloads.
- `npm run e2e` : 4 parcours Playwright OK.

À compléter en preview avant production :

- audit Lighthouse sur `/`, `/tarifs`, `/contact`, `/liste-attente`
- navigation clavier manuelle sur `/`, `/contact`, `/admin`, `/admin/recettes`

## Points de vigilance

- Les mockups CSS remplacent des images bitmap lourdes ; si de vraies images produit sont ajoutées, imposer dimensions, `loading="lazy"` hors hero, et formats optimisés.
- Les pages admin restent server-driven côté API ; si le volume dépasse 50 lignes utiles, ajouter pagination API réelle au lieu de tout charger.
