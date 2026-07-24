export const adminRoles = [
  'editor',
  'moderator',
  'support',
  'administrator',
  'super_administrator',
] as const

export type AdminRole = (typeof adminRoles)[number]

export type AdminResource =
  'content' | 'moderation' | 'support_case' | 'admin_settings' | 'role_assignment'

export type AdminAction = 'read' | 'write'

export type AdminPermission = {
  resource: AdminResource
  action: AdminAction
  minimumRole: AdminRole
}

export const adminRoleRank: Record<AdminRole, number> = {
  editor: 10,
  moderator: 20,
  support: 30,
  administrator: 40,
  super_administrator: 50,
}

export const adminPermissionMatrix: AdminPermission[] = [
  { resource: 'content', action: 'read', minimumRole: 'editor' },
  { resource: 'content', action: 'write', minimumRole: 'editor' },
  { resource: 'moderation', action: 'read', minimumRole: 'moderator' },
  { resource: 'moderation', action: 'write', minimumRole: 'moderator' },
  { resource: 'support_case', action: 'read', minimumRole: 'support' },
  { resource: 'support_case', action: 'write', minimumRole: 'support' },
  { resource: 'admin_settings', action: 'read', minimumRole: 'administrator' },
  { resource: 'admin_settings', action: 'write', minimumRole: 'administrator' },
  { resource: 'role_assignment', action: 'read', minimumRole: 'administrator' },
  { resource: 'role_assignment', action: 'write', minimumRole: 'administrator' },
]

export const hasAdminRole = (actualRole: AdminRole | null | undefined, minimumRole: AdminRole) => {
  if (!actualRole) {
    return false
  }

  if (actualRole === 'super_administrator') {
    return true
  }

  if (actualRole === 'administrator') {
    return minimumRole !== 'super_administrator'
  }

  return actualRole === minimumRole
}

export const canManageAdminRole = (
  actorRole: AdminRole | null | undefined,
  targetRole: AdminRole,
) => {
  if (!actorRole) {
    return false
  }

  if (targetRole === 'administrator' || targetRole === 'super_administrator') {
    return actorRole === 'super_administrator'
  }

  return hasAdminRole(actorRole, 'administrator')
}

export const canAccessAdminPermission = (
  actualRole: AdminRole | null | undefined,
  resource: AdminResource,
  action: AdminAction,
) => {
  const permission = adminPermissionMatrix.find(
    (entry) => entry.resource === resource && entry.action === action,
  )

  return permission ? hasAdminRole(actualRole, permission.minimumRole) : false
}
