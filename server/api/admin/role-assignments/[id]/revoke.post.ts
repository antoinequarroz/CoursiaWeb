import { getRouterParam, readValidatedBody } from 'h3'
import { canRevokeAdminRoleAssignment } from '#shared/admin/sensitive-operations'
import {
  adminRoleAssignmentParamsSchema,
  revokeAdminRoleAssignmentSchema,
} from '#shared/validation/admin'

export default defineEventHandler(async (event) => {
  const params = adminRoleAssignmentParamsSchema.safeParse({
    id: getRouterParam(event, 'id'),
  })

  if (!params.success) {
    throwValidationError(params.error)
  }

  const body = await readValidatedBody(event, (input) => {
    const result = revokeAdminRoleAssignmentSchema.safeParse(input)

    if (!result.success) {
      throwValidationError(result.error)
    }

    return result.data
  })

  const actor = await getSensitiveAdminContext(event)
  const serviceRoleClient = createSupabaseServiceRoleClient()

  const { data: targetAssignment, error: lookupError } = await serviceRoleClient
    .from('admin_role_assignments')
    .select('id, role, revoked_at')
    .eq('id', params.data.id)
    .maybeSingle()

  if (lookupError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger la ressource ciblée.')
  }

  if (!targetAssignment) {
    throwApiError('NOT_FOUND', 'Ressource introuvable.')
  }

  const decision = canRevokeAdminRoleAssignment(actor.role, targetAssignment.role)

  if (!decision.allowed) {
    throwApiError(decision.code, decision.message)
  }

  if (targetAssignment.revoked_at) {
    return {
      data: {
        id: targetAssignment.id,
        status: 'already_revoked',
      },
    }
  }

  const { data: revokedAssignment, error: revokeError } = await serviceRoleClient
    .from('admin_role_assignments')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: actor.userId,
      revoke_reason: body.reason,
    })
    .eq('id', targetAssignment.id)
    .is('revoked_at', null)
    .select('id')
    .single()

  if (revokeError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de révoquer le rôle administrateur.')
  }

  await writeAdminAuditLog(serviceRoleClient, {
    actorUserId: actor.userId,
    action: 'role_change',
    resourceType: 'admin_role_assignment',
    resourceId: revokedAssignment.id,
    context: {
      operation: 'revoke',
      targetRole: targetAssignment.role,
    },
  })

  return {
    data: {
      id: revokedAssignment.id,
      status: 'revoked',
    },
  }
})
