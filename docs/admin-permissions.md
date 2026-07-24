# Matrice des rôles et permissions administratives

Le modèle d’administration Coursia utilise des rôles stockés en base dans `public.admin_role_assignments`.
Il ne dépend pas de `user_metadata`, car ces métadonnées sont modifiables par l’utilisateur et ne doivent pas
servir aux décisions d’autorisation.

## Rôles

| Rôle                  | Usage                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| `editor`              | Gérer le contenu éditorial public.                                        |
| `moderator`           | Modérer les contenus et signalements.                                     |
| `support`             | Accéder aux informations nécessaires au support utilisateur.              |
| `administrator`       | Configurer l’administration et gérer les rôles opérationnels.             |
| `super_administrator` | Gérer tous les accès, y compris administrateurs et super-administrateurs. |

## Matrice action / ressource / rôle minimal

| Ressource         | Action                                              | Rôle minimal          |
| ----------------- | --------------------------------------------------- | --------------------- |
| `content`         | `read`                                              | `editor`              |
| `content`         | `write`                                             | `editor`              |
| `moderation`      | `read`                                              | `moderator`           |
| `moderation`      | `write`                                             | `moderator`           |
| `support_case`    | `read`                                              | `support`             |
| `support_case`    | `write`                                             | `support`             |
| `admin_settings`  | `read`                                              | `administrator`       |
| `admin_settings`  | `write`                                             | `administrator`       |
| `role_assignment` | `read`                                              | `administrator`       |
| `role_assignment` | `write` pour `editor`, `moderator`, `support`       | `administrator`       |
| `role_assignment` | `write` pour `administrator`, `super_administrator` | `super_administrator` |

## Règles de sécurité

- Les routes admin demandent une session Supabase valide et un rôle actif non révoqué.
- Le retrait d’un rôle renseigne `revoked_at`, `revoked_by` et `revoke_reason`. Il prend effet au prochain contrôle serveur ou rechargement de session.
- Les politiques RLS vérifient les rôles en base via des fonctions `app_private` sécurisées.
- Les changements de rôle ne sont pas autorisés depuis des claims contrôlables par l’utilisateur.
- Un rôle existant ne doit pas être réassigné par `UPDATE`. Il doit être révoqué, puis recréé avec le nouveau rôle.
- `editor`, `moderator` et `support` sont des rôles opérationnels distincts. `administrator` hérite des permissions opérationnelles pour l’administration courante, et `super_administrator` hérite de toutes les permissions.
