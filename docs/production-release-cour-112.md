# COUR-112 — Déploiement et validation production

Ce document prépare la mise en production du site public et de l’administration Coursia.

État actuel : aucun déploiement production réel n’a été exécuté depuis ce repo, car aucune cible d’hébergement, aucun domaine canonique et aucun fichier `.openai/hosting.json` ne sont configurés. La promotion production doit donc rester une action explicite, faite par la personne responsable de release.

## Domaine, HTTPS, variables et redirections

Avant promotion :

- définir le domaine canonique HTTPS dans `NUXT_PUBLIC_SITE_URL` ;
- configurer le certificat HTTPS chez l’hébergeur ;
- rediriger HTTP vers HTTPS ;
- rediriger les domaines secondaires vers le domaine canonique ;
- configurer les variables de `.env.production.example` dans le secret store de production ;
- vérifier que `NUXT_SUPABASE_SERVICE_ROLE_KEY` reste server-only ;
- vérifier que les variables publiques Supabase utilisent uniquement la clé publishable ;
- définir `NUXT_SENTRY_ENVIRONMENT=production` et une valeur stable pour `NUXT_SENTRY_RELEASE`.

Les variables réelles ne doivent pas être commitées.

## Site public, robots.txt et sitemap.xml

Validation minimale après déploiement :

```bash
curl -I https://<domaine-production>/
curl https://<domaine-production>/robots.txt
curl https://<domaine-production>/sitemap.xml
```

Critères :

- `/` répond en HTTPS ;
- `/robots.txt` autorise le site public, bloque `/admin` et `/auth`, et référence `sitemap.xml` ;
- `/sitemap.xml` contient les routes publiques importantes ;
- les pages publiques principales chargent sans session : `/`, `/fonctionnalites`, `/comment-ca-marche`, `/tarifs`, `/faq`, `/contact`, `/liste-attente`, `/legal`, `/support` ;
- les canonical et métadonnées utilisent le domaine de production.

## Admin protégé

Validation obligatoire :

- ouvrir `/admin` sans session et confirmer la redirection vers `/auth/login` ;
- se connecter avec un compte autorisé ;
- confirmer que `/admin` s’ouvre avec navigation, dashboard et données limitées au rôle ;
- confirmer qu’un compte sans rôle administrateur reste refusé ;
- vérifier qu’aucun bypass E2E admin n’est actif en production.

Les comptes autorisés doivent être créés ou validés dans Supabase Auth avant la recette.

## Migrations Supabase

Les migrations production ne sont jamais appliquées automatiquement par la CI pull request.

Procédure :

1. exécuter `supabase migration list` et comparer local, preview et production ;
2. valider les migrations sur preview ;
3. contrôler RLS, policies, Storage et advisors Supabase ;
4. confirmer une sauvegarde ou un point de restauration exploitable ;
5. appliquer uniquement les migrations approuvées en production ;
6. relancer les tests de fumée public, admin et publication recette.

Les findings sécurité de COUR-109 doivent être corrigés ou acceptés explicitement avant go-live, notamment :

- vues publiques sans `security_invoker` ;
- fonction `public.rls_auto_enable` `SECURITY DEFINER` exécutable publiquement ;
- bucket Storage `images` public sans limites MIME/taille documentées.

## Sauvegarde, rollback et responsabilités

Responsabilités à renseigner avant release :

| Rôle | Responsable |
| ---- | ----------- |
| Décision go/no-go | À renseigner |
| Déploiement applicatif | À renseigner |
| Migrations Supabase | À renseigner |
| Validation admin | À renseigner |
| Support post-release | À renseigner |
| Décision rollback | À renseigner |

Rollback applicatif :

1. identifier le dernier commit stable ;
2. redéployer ce commit avec les variables production existantes ;
3. vérifier `/`, `/robots.txt`, `/sitemap.xml`, `/admin` et les logs serveur.

Rollback base de données :

- privilégier les migrations additives et correctives ;
- ne pas réécrire l’historique des migrations déjà appliquées ;
- restaurer une sauvegarde uniquement après décision explicite du responsable go/no-go et du responsable Supabase.

## Recette complète en production

Scénario de recette :

1. se connecter avec un compte autorisé ;
2. créer une recette complète depuis `/admin/recettes` ;
3. renseigner portions, durée, difficulté, ingrédients, quantités, étapes, source et catégories ;
4. ajouter ou sélectionner un média conforme ;
5. ouvrir la prévisualisation web/mobile ;
6. publier la recette ;
7. vérifier qu’elle apparaît côté public/app selon le comportement attendu ;
8. vérifier l’entrée correspondante dans le journal d’audit ;
9. archiver ou conserver la recette selon le plan de test.

## Aucun bug bloquant ou critique ouvert

Avant go-live :

- `npm run release:check` passe ;
- `npm run ci:pr` passe sur le commit candidat ;
- aucun bug P0/P1 ouvert ne touche l’authentification, l’admin, la publication recette, les données Supabase, le paiement ou la confidentialité ;
- les vulnérabilités critiques sont corrigées ou acceptées formellement ;
- les preuves de validation sont jointes au ticket de release.
