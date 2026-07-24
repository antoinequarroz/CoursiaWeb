# Coursia Web

Base Nuxt pour le site public et l’administration Coursia.

## Stack

- Nuxt 4
- Vue 3
- TypeScript strict
- Tailwind CSS 4
- ESLint, Prettier et Vitest

## Prérequis

- Node.js 22.19.0 ou plus récent
- npm 11.18.0 ou plus récent

## Installation

```bash
npm install
```

Copier le modèle d’environnement si nécessaire :

```bash
cp .env.example .env
```

## Variables d’environnement

| Variable                               | Obligatoire        | Description                                                                          |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------ |
| `NUXT_PUBLIC_SITE_URL`                 | Non                | URL publique de base utilisée par l’application.                                     |
| `NUXT_PUBLIC_SUPABASE_URL`             | Oui                | URL publique du projet Supabase.                                                     |
| `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Oui                | Clé publique/publishable utilisable côté navigateur.                                 |
| `NUXT_SUPABASE_SERVICE_ROLE_KEY`       | Serveur uniquement | Clé privilégiée réservée aux traitements serveur. Ne jamais ajouter `PUBLIC` au nom. |

## Commandes

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run supabase:types
```

## Architecture

- `app/pages` contient les pages routées.
- `app/layouts/public.vue` contient le layout du site public.
- `app/layouts/admin.vue` contient le layout de l’administration.
- `app/components/base` contient les composants de base fondés sur les tokens.
- `app/assets` contient les assets applicatifs, dont les variables CSS/Tailwind.
- `app/admin` contient les modules et composables spécifiques à l’administration.
- `shared` contient le code partagé entre l’app et le serveur.
- `shared/design-system` contient les tokens Coursia partageables avec d’autres clients.
- `shared/supabase` contient les types et helpers Supabase partagés.
- `shared/validation` contient les schémas Zod partagés.
- `server` contient les routes Nuxt server et le code serveur.
- `supabase/schemas` contient le schéma SQL versionné.
- `app/pages/design-system.vue` documente la palette, les thèmes et les variantes de composants.

Alias configurés :

- `#app-root` → `app`
- `#admin` → `app/admin`
- `#shared` → `shared`

## Design system

Les tokens Coursia sont centralisés dans `shared/design-system/tokens.ts` et exposés à Tailwind via
`app/assets/css/main.css`.

Le design system couvre :

- palette officielle clair/sombre ;
- typographie ;
- espacements ;
- rayons ;
- ombres ;
- effet glass ;
- variantes accessibles avec focus visible.

La page de démonstration est disponible sur `/design-system`.

## Supabase

L’intégration Supabase sépare explicitement les accès navigateur et serveur :

- `app/utils/supabase/browser.ts` crée le client navigateur avec uniquement les variables publiques.
- `server/utils/supabase/server.ts` crée le client serveur SSR et le client `service_role` serveur uniquement.
- `shared/supabase/database.types.ts` contient les types de base alignés sur le schéma versionné.
- `shared/validation` contient les schémas Zod partagés entre formulaires et routes serveur.
- `server/api/courses/public.get.ts` expose une requête publique.
- `server/api/courses/me.get.ts` expose une requête authentifiée basée sur l’utilisateur Supabase courant.

Le schéma versionné est dans `supabase/schemas/public.sql`.

Après démarrage d’un environnement Supabase local, les types peuvent être régénérés avec :

```bash
npm run supabase:types
```

## Authentification admin

L’administration est protégée avec Supabase SSR :

- `server/middleware/admin-auth.ts` protège les accès directs et les rafraîchissements SSR sur `/admin`.
- `app/middleware/admin-auth.global.ts` protège les navigations côté client.
- `app/pages/auth/login.vue` gère la connexion et le retour vers la page admin demandée.
- `server/routes/auth/callback.get.ts` échange les codes PKCE/OAuth/magic link contre une session serveur.
- `server/api/auth/session.get.ts` récupère la session sans exposer d’informations sensibles.
- `server/api/auth/logout.post.ts` gère la déconnexion.

Les redirections sont limitées aux routes `/admin` pour éviter les retours externes non sûrs.

## Rôles et permissions admin

Le modèle de rôles est documenté dans `docs/admin-permissions.md`.

Les décisions d’autorisation reposent sur `public.admin_role_assignments`, pas sur `user_metadata`.
Les politiques RLS du schéma Supabase utilisent des fonctions `app_private` sécurisées pour vérifier
le rôle actif en base. Un rôle retiré reçoit `revoked_at`, ce qui le rend immédiatement inactif pour
les prochains contrôles serveur/RLS.
