import { describe, expect, it } from 'vitest'
import {
  adminPermissionMatrix,
  canAccessAdminPermission,
  canManageAdminRole,
  hasAdminRole,
} from '#shared/auth/permissions'

describe('admin permission matrix', () => {
  it('documents action/resource/minimum-role permissions', () => {
    expect(adminPermissionMatrix).toContainEqual({
      resource: 'role_assignment',
      action: 'write',
      minimumRole: 'administrator',
    })
  })

  it('allows higher roles to inherit lower operational permissions', () => {
    expect(canAccessAdminPermission('administrator', 'content', 'write')).toBe(true)
    expect(canAccessAdminPermission('super_administrator', 'admin_settings', 'write')).toBe(true)
  })

  it('denies insufficient roles in negative scenarios', () => {
    expect(hasAdminRole('editor', 'administrator')).toBe(false)
    expect(canAccessAdminPermission('moderator', 'content', 'write')).toBe(false)
    expect(canAccessAdminPermission('moderator', 'support_case', 'read')).toBe(false)
    expect(canAccessAdminPermission(null, 'content', 'read')).toBe(false)
  })

  it('restricts administrator and super-administrator role changes to super-administrators', () => {
    expect(canManageAdminRole('administrator', 'editor')).toBe(true)
    expect(canManageAdminRole('administrator', 'administrator')).toBe(false)
    expect(canManageAdminRole('administrator', 'super_administrator')).toBe(false)
    expect(canManageAdminRole('super_administrator', 'administrator')).toBe(true)
  })
})
