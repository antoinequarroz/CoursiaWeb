import type { AdminAction, AdminResource, AdminRole } from '#shared/auth/permissions'
import { canAccessAdminPermission, canManageAdminRole } from '#shared/auth/permissions'
import type { ApiErrorCode } from '#shared/api/errors'

export type SensitiveOperationDecision =
  | { allowed: true }
  | { allowed: false; code: ApiErrorCode; message: string }

export const canRunSensitiveAdminOperation = (
  actorRole: AdminRole | null | undefined,
  resource: AdminResource,
  action: AdminAction,
): SensitiveOperationDecision => {
  if (!actorRole) {
    return {
      allowed: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentification administrateur requise.',
    }
  }

  if (!canAccessAdminPermission(actorRole, resource, action)) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: 'Permission administrateur insuffisante.',
    }
  }

  return { allowed: true }
}

export const canRevokeAdminRoleAssignment = (
  actorRole: AdminRole | null | undefined,
  targetRole: AdminRole,
): SensitiveOperationDecision => {
  const baseDecision = canRunSensitiveAdminOperation(actorRole, 'role_assignment', 'write')

  if (!baseDecision.allowed) {
    return baseDecision
  }

  if (!canManageAdminRole(actorRole, targetRole)) {
    return {
      allowed: false,
      code: 'FORBIDDEN',
      message: 'Ce rôle ne peut être modifié que par un niveau administrateur supérieur.',
    }
  }

  return { allowed: true }
}
