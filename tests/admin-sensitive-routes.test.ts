import { describe, expect, it } from 'vitest'
import { createApiErrorBody } from '#shared/api/errors'
import {
  canRevokeAdminRoleAssignment,
  canRunSensitiveAdminOperation,
} from '#shared/admin/sensitive-operations'
import {
  adminRoleAssignmentParamsSchema,
  adminAuditLogQuerySchema,
  revokeAdminRoleAssignmentSchema,
} from '#shared/validation/admin'
import { sanitizeAuditContext } from '#shared/admin/audit'

describe('sensitive admin server operations', () => {
  it('allows an authorized administrator to revoke operational roles', () => {
    expect(canRevokeAdminRoleAssignment('administrator', 'editor')).toEqual({ allowed: true })
    expect(canRevokeAdminRoleAssignment('super_administrator', 'administrator')).toEqual({
      allowed: true,
    })
  })

  it('denies missing or insufficient roles', () => {
    expect(canRunSensitiveAdminOperation(null, 'role_assignment', 'write')).toMatchObject({
      allowed: false,
      code: 'AUTH_REQUIRED',
    })
    expect(canRevokeAdminRoleAssignment('support', 'editor')).toMatchObject({
      allowed: false,
      code: 'FORBIDDEN',
    })
    expect(canRevokeAdminRoleAssignment('administrator', 'super_administrator')).toMatchObject({
      allowed: false,
      code: 'FORBIDDEN',
    })
    expect(canRunSensitiveAdminOperation('support', 'admin_settings', 'read')).toMatchObject({
      allowed: false,
      code: 'FORBIDDEN',
    })
  })

  it('validates targeted resources and request bodies', () => {
    expect(
      adminRoleAssignmentParamsSchema.safeParse({
        id: '7a65a7ff-7f53-4754-908b-0ee67372f920',
      }).success,
    ).toBe(true)
    expect(adminRoleAssignmentParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false)
    expect(revokeAdminRoleAssignmentSchema.safeParse({ reason: 'Départ équipe' }).success).toBe(
      true,
    )
    expect(revokeAdminRoleAssignmentSchema.safeParse({ reason: 'no' }).success).toBe(false)
  })

  it('uses a common error payload without leaking extra data', () => {
    expect(createApiErrorBody('FORBIDDEN', 'Permission administrateur insuffisante.')).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Permission administrateur insuffisante.',
      },
    })
  })

  it('validates audit log filters and strips sensitive context values', () => {
    expect(
      adminAuditLogQuerySchema.safeParse({
        action: 'role_change',
        resourceType: 'admin_role_assignment',
        limit: '25',
      }).success,
    ).toBe(true)
    expect(adminAuditLogQuerySchema.safeParse({ action: 'delete' }).success).toBe(false)
    expect(
      adminAuditLogQuerySchema.safeParse({
        from: '2026-07-25T10:00:00+02:00',
        to: '2026-07-24T10:00:00+02:00',
      }).success,
    ).toBe(false)

    expect(
      sanitizeAuditContext({
        targetRole: 'editor',
        password: 'secret-password',
        token: 'secret-token',
      }),
    ).toEqual({ targetRole: 'editor' })
  })
})
