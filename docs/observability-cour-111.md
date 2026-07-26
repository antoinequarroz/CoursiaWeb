# COUR-111 — Sentry, logs et alertes web

Date : 2026-07-26

## État d'intégration

L'installation directe de `@sentry/nuxt` a été tentée, mais npm a refusé la résolution stricte à cause d'un conflit peer dependency entre l'écosystème Nuxt/Vite/Nitro présent dans le projet et `@sentry/nuxt@10.68.0`.

Décision : ne pas forcer `--legacy-peer-deps` pour éviter une intégration instable. Le repo contient maintenant une couche d'observabilité Sentry-compatible et optionnelle :

- DSN absent : aucun envoi externe.
- DSN présent : la configuration est prête à être raccordée au SDK Sentry Nuxt dès que la résolution de dépendances est saine.
- Les erreurs client sont capturées via un plugin Nuxt client et envoyées à une route serveur interne.
- Les erreurs serveur Nitro sont capturées via un plugin Nitro.
- Les logs incluent un `requestId` corrélé entre requête, erreur et action.

## Configuration d'environnements

Variables :

- `NUXT_SENTRY_DSN`
- `NUXT_SENTRY_ENVIRONMENT`
- `NUXT_SENTRY_RELEASE`
- `NUXT_SENTRY_SOURCEMAPS`
- `NUXT_PUBLIC_SENTRY_ENVIRONMENT`
- `NUXT_PUBLIC_SENTRY_RELEASE`

Les source maps sont activées uniquement avec `NUXT_SENTRY_SOURCEMAPS=true`. La séparation se fait par environnement et release.

## Filtrage des données

Les champs suivants sont filtrés avant log :

- mots de passe
- secrets
- tokens
- API keys
- service-role
- authorization
- cookies
- emails
- téléphones
- adresses
- brouillons de recette
- recettes non publiées

Les payloads sont tronqués pour éviter de remonter des contenus administratifs complets.

## Alertes critiques définies

- Erreur serveur critique : au moins 1 erreur serveur sur 5 minutes.
- Spike de refus admin : 5 refus admin sur 10 minutes.
- Régression client : taux d'erreur client supérieur à 2% sur 15 minutes.
- Ingestion silencieuse : aucun événement observé en production pendant 24 h.

## Incident de test

Scénario compris et vérifiable :

1. Une erreur Vue côté client déclenche `app/plugins/observability.client.ts`.
2. Le plugin POST vers `/api/observability/client-error`.
3. La route valide le payload, filtre les données sensibles et logge un événement corrélé avec `x-request-id`.
4. Le test `tests/observability-cour-111.test.ts` vérifie redaction, variables, source maps, request id et alertes.

## À faire lors du raccord Sentry réel

- Réessayer l'installation `@sentry/nuxt` après alignement Nuxt/Vite/Nitro.
- Raccorder `captureObservabilityEvent` à `Sentry.captureException` / `Sentry.captureMessage`.
- Configurer l'upload source maps avec un token CI stocké uniquement dans les secrets du provider.
- Déclencher un incident de test en preview et vérifier sa présence dans Sentry.
