# Journal d’audit administratif

Le journal d’audit conserve les actions administratives importantes dans `public.admin_audit_logs`.
Il trace les changements sans stocker de secrets, jetons, cookies, mots de passe ou payloads complets.

## Actions tracées

| Action        | Usage prévu                                      |
| ------------- | ------------------------------------------------ |
| `create`      | Création d’une ressource administrée.            |
| `update`      | Modification d’une ressource administrée.        |
| `publish`     | Publication d’un contenu.                        |
| `archive`     | Archivage ou retrait d’un contenu.               |
| `moderate`    | Décision ou consultation liée à la modération.   |
| `role_change` | Attribution ou révocation d’un rôle admin.       |

Chaque entrée conserve l’auteur, l’action, le type de ressource, l’identifiant de ressource, la date et un contexte minimal en JSON.

## Sécurité

- RLS est activé sur `public.admin_audit_logs`.
- Les rôles ordinaires ne peuvent pas insérer, modifier ou supprimer les journaux via l’API publique.
- La lecture est réservée aux administrateurs via `app_private.has_admin_role('administrator')`.
- Les écritures applicatives passent par les routes serveur avec la clé service-role uniquement côté serveur.
- Le contexte est filtré par `sanitizeAuditContext` pour exclure les clés sensibles connues.

## Consultation

Une route filtrable est prévue pour l’interface d’administration :

`GET /api/admin/audit-logs`

Filtres disponibles :

- `action`
- `resourceType`
- `actorUserId`
- `from`
- `to`
- `limit`

## Conservation

Durée de conservation cible : 400 jours.

La purge automatique n’est pas activée dans cette phase. Elle devra être ajoutée via une tâche planifiée Supabase Cron ou une procédure serveur dédiée lorsque la politique de conformité sera finalisée.
