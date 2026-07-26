# COUR-109 — Audit sécurité web, admin et Supabase

Date d'audit : 2026-07-26  
Projet Supabase inspecté : `courseo` / `bpycfeyapuekmesmxnvd`.

## Résumé

Le code web protège les opérations administratives via une double barrière : middleware SSR/navigation pour `/admin`, puis contrôle serveur `getSensitiveAdminContext` et vérification de rôle par route sensible. Les mutations privilégiées utilisent le client service-role uniquement côté serveur.

Le bypass E2E admin est ignoré en production, même si `NUXT_E2E_BYPASS_ADMIN_AUTH=true` est défini par erreur.

## Corrections appliquées

Migrations appliquées sur Supabase :

- `20260726213359_harden_public_views_functions_storage`
- `20260726213448_restrict_images_delete_policy`

Résultat vérifié :

- toutes les vues publiques auditées utilisent `security_invoker = true` :
  - `prix_anomalies`
  - `prix_courant`
  - `prix_doublons_suspects`
  - `profils_actifs`
  - `rapport_fraicheur_prix_par_enseigne`
  - `recette_allergenes_effectifs`
  - `recettes_a_moderer`
- `public.rls_auto_enable()` n’est plus exécutable par `PUBLIC`, `anon` ou `authenticated`; seuls `postgres` et `service_role` conservent l’exécution.
- le bucket Storage `images` conserve la lecture publique, mais impose :
  - limite fichier : `5242880` octets ;
  - MIME types : `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
- les policies Storage d’écriture/remplacement/suppression ciblent `authenticated` :
  - `images_write`
  - `images_update`
  - `images_delete`
- la policy `images_read` reste publique pour les médias publiquement exposés.

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

## Points conformes

- Les rôles admin ne reposent pas sur `user_metadata`.
- Les helpers SQL admin sont dans `app_private`, avec `search_path = ''`.
- Les tables admin locales déclarées dans `supabase/schemas/public.sql` activent RLS et révoquent les privilèges par défaut avant grants ciblés.
- Les routes admin utilisent les validations partagées et ne renvoient pas de secrets.
- Les clés publiques et serveur sont séparées dans `runtimeConfig`.
- Le bundle client utilise uniquement `NUXT_PUBLIC_SUPABASE_URL` et `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Les headers HTTP de durcissement sont configurés : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.

## Risques restants avant production

1. Revoir les policies legacy qui utilisent encore le rôle `{public}` et les convertir en `to anon` / `to authenticated` selon le besoin réel.
2. Revoir les policies `ALL` ou `UPDATE` existantes qui n'ont pas toujours `WITH CHECK`, notamment pour éviter une réassignation horizontale après update.
3. Recontrôler les vulnérabilités npm high de la chaîne Nuxt/test-utils avant gel production. Aucune vulnérabilité critique n’a été détectée pendant l’audit.

## Changelog Supabase vérifié

Points pertinents au 2026-07-26 :

- Les nouvelles tables ne sont plus automatiquement exposées à la Data API selon la configuration projet ; les grants doivent être intentionnels.
- Les vues restent sensibles : utiliser `security_invoker = true` sur PostgreSQL 15+ ou révoquer/déplacer.
- Storage : l'upsert exige INSERT + SELECT + UPDATE.
- Node.js 22+ requis par les librairies Supabase modernes ; le repo demande déjà `>=22.19.0`.

## Décision

COUR-109 est couvert côté application, audit local et corrections Supabase distantes. Les migrations correspondantes sont versionnées dans `supabase/migrations`.
