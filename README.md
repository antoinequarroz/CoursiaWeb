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

| Variable               | Obligatoire | Description                                                                                |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `NUXT_PUBLIC_SITE_URL` | Non         | URL publique de base utilisée par l’application. La valeur locale est dans `.env.example`. |

## Commandes

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
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
- `server` contient les routes Nuxt server et le code serveur.
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
