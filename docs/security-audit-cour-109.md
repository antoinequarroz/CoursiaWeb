# COUR-109 — Audit sécurité web, admin et Supabase

Date d'audit : 2026-07-26  
Périmètre : site Nuxt, routes admin Nitro, Auth Supabase, RLS, Storage, secrets, CI et tests négatifs.

## Résumé

Le code web protège les opérations administratives via une double barrière : middleware SSR/navigation pour `/admin`, puis contrôle serveur systématique `getSensitiveAdminContext` + vérification de rôle par route sensible. Les mutations privilégiées utilisent le client service-role uniquement côté serveur.

L'audit a relevé un risque local corrigé immédiatement : `NUXT_E2E_BYPASS_ADMIN_AUTH=true` pouvait bypasser l'auth admin si la variable était activée par erreur en production. Le bypass est maintenant ignoré quand `NODE_ENV=production`.

## Preuves locales

- `npm run ci:secrets` : aucune clé privilégiée détectée dans les fichiers suivis.
- `npm audit --audit-level=critical` : aucune vulnérabilité critique bloquante.
- Les routes sensibles vérifiées par tests contractuels exigent :
  - `getSensitiveAdminContext`
  - validation Zod avec `safeParse`
  - rôle minimal explicite
  - service-role uniquement après contrôle de rôle
  - audit log sur mutation sensible
- Les E2E couvrent des refus et parcours réels sans données de production.

## Supabase MCP — lectures effectuées

Projet inspecté : `courseo` / `bpycfeyapuekmesmxnvd`.

Requêtes read-only lancées :

- tables `public` sans RLS
- fonctions `SECURITY DEFINER`
- vues publiques
- buckets Storage
- policies `public` et `storage`

Résultats :

- Aucune table `public` sans RLS détectée.
- Vues publiques détectées sans option `security_invoker` visible :
  - `prix_anomalies`
  - `prix_courant`
  - `prix_doublons_suspects`
  - `profils_actifs`
  - `rapport_fraicheur_prix_par_enseigne`
  - `recette_allergenes_effectifs`
  - `recettes_a_moderer`
- Fonctions `SECURITY DEFINER` détectées :
  - `app_private.current_admin_role`
  - `app_private.has_admin_role`
  - `app_private.can_manage_admin_role`
  - `public.rls_auto_enable`
- Storage :
  - bucket `images` public
  - pas de limite MIME/taille configurée
  - policy INSERT et SELECT présentes
  - pas de policy UPDATE, donc les upserts/remplacements doivent être traités comme non disponibles côté client

## Points conformes

- Les rôles admin ne reposent pas sur `user_metadata`.
- Les helpers SQL admin sont dans `app_private`, avec `search_path = ''`, sauf la fonction existante `public.rls_auto_enable`.
- Les tables admin locales déclarées dans `supabase/schemas/public.sql` activent RLS et révoquent les privilèges par défaut avant grants ciblés.
- Les routes admin utilisent les validations partagées et ne renvoient pas de secrets.
- Les clés publiques et serveur sont séparées dans `runtimeConfig`.
- Le bundle client utilise uniquement `NUXT_PUBLIC_SUPABASE_URL` et `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Les headers HTTP de durcissement sont configurés : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.

## Risques à traiter avant production

1. Convertir les vues publiques sensibles en `security_invoker = true`, ou les déplacer/révoquer si elles ne doivent pas être exposées via Data API.
2. Revoir `public.rls_auto_enable` : une fonction `SECURITY DEFINER` en schema `public` avec exécution publique est un risque. Elle doit être révoquée, déplacée en schema non exposé, ou supprimée si obsolète.
3. Configurer Storage pour les images :
   - limite de taille
   - MIME types autorisés
   - séparation claire entre médias privés en validation et médias publiés
   - policy UPDATE si l'upsert client est requis ; sinon conserver les remplacements via route serveur uniquement
4. Remplacer les policies legacy qui utilisent le rôle `{public}` par des policies explicites `to anon` / `to authenticated` selon le besoin réel.
5. Revoir les policies `ALL` qui n'ont pas toujours `WITH CHECK`, notamment pour éviter réassignation horizontale après update.
6. Les vulnérabilités npm high viennent de la chaîne Nuxt/test-utils. Pas de critique détectée, mais à recontrôler avant gel production.

## Changelog Supabase vérifié

Points pertinents au 2026-07-26 :

- Les nouvelles tables ne sont plus automatiquement exposées à la Data API selon la configuration projet ; les grants doivent être intentionnels.
- Les vues restent un point sensible : utiliser `security_invoker = true` sur PostgreSQL 15+ ou révoquer/déplacer.
- Storage : l'upsert exige INSERT + SELECT + UPDATE.
- Node.js 22+ requis par les librairies Supabase modernes ; le repo demande déjà `>=22.19.0`.

## Décision

COUR-109 est couvert côté application et audit local. Les corrections SQL distantes listées ci-dessus ne sont pas appliquées automatiquement dans ce ticket pour éviter une mutation de production sans validation explicite.
