# CI et environnements web

## Environnements

Le web Coursia sépare les variables par cible :

| Cible | Exemple versionné | Usage |
| ----- | ----------------- | ----- |
| Développement | `.env.development.example` | Exécution locale et projet Supabase de développement. |
| Préproduction / preview | `.env.preview.example` | Validation fonctionnelle avant production. |
| Production | `.env.production.example` | Déploiement public final. |

Les vraies valeurs `.env`, `.env.development`, `.env.preview` et `.env.production` restent ignorées par Git.
Les clés privilégiées doivent être configurées dans le secret store local ou de l’hébergeur, jamais dans le dépôt.

## CI pull request

Le workflow `.github/workflows/ci.yml` s’exécute sur pull request et push vers `main`/`develop`.

Étapes obligatoires :

1. `npm ci`
2. `npm run ci:secrets`
3. `npm run typecheck`
4. `npm run lint`
5. `npm test`
6. `npm run build`
7. `npm run e2e`

Le build CI utilise des valeurs publiques factices pour Supabase et aucune clé service-role.

## Prévisualisation avant production

Chaque pull request doit produire un build valide. La prévisualisation se fait sur l’environnement preview de l’hébergeur avec les variables `.env.preview` configurées comme secrets.

Validation minimale avant promotion :

- la CI est verte ;
- `npm run release:check` passe sur le commit candidat ;
- l’URL preview charge l’application ;
- les routes publiques fonctionnent avec le projet Supabase preview ;
- les routes admin nécessitent une session et un rôle valide ;
- aucune clé `service_role` n’apparaît dans le bundle client ni dans les variables publiques.

## Workflow Supabase

Les changements de schéma sont développés dans `supabase/schemas/public.sql`.

Workflow contrôlé :

1. appliquer et tester les changements sur développement ;
2. vérifier RLS, policies et advisors Supabase ;
3. générer ou synchroniser une migration propre selon le workflow Supabase CLI du projet ;
4. appliquer en preview ;
5. valider l’application preview ;
6. appliquer en production.

Les migrations ne doivent pas être appliquées automatiquement par la CI pull request.

## Déploiement

1. Fusionner uniquement si la CI est verte.
2. Déployer en preview avec les variables preview.
3. Exécuter les migrations Supabase contrôlées sur preview.
4. Tester les parcours critiques.
5. Exécuter `npm run release:check`.
6. Promouvoir le même commit en production.
7. Exécuter les migrations production après validation explicite.
8. Suivre le runbook `docs/production-release-cour-112.md`.

## Rollback

Rollback applicatif :

1. redéployer le dernier commit stable ;
2. vérifier que les variables d’environnement correspondent à la cible ;
3. contrôler les logs serveur et les routes critiques.

Rollback base de données :

- éviter les migrations destructives sans plan de retour ;
- préférer des migrations additives ;
- si une migration doit être annulée, créer une migration corrective explicite ;
- ne jamais réécrire l’historique de migrations déjà appliqué en preview ou production.
