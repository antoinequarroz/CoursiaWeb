import { getValidatedQuery } from 'h3'
import { canRunSensitiveAdminOperation } from '#shared/admin/sensitive-operations'
import { adminAuditLogQuerySchema } from '#shared/validation/admin'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, (input) => {
    const result = adminAuditLogQuerySchema.safeParse(input)

    if (!result.success) {
      throwValidationError(result.error)
    }

    return result.data
  })

  const actor = await getSensitiveAdminContext(event)
  const decision = canRunSensitiveAdminOperation(actor.role, 'admin_settings', 'read')

  if (!decision.allowed) {
    throwApiError(decision.code, decision.message)
  }

  const serviceRoleClient = createSupabaseServiceRoleClient()

  let auditQuery = serviceRoleClient
    .from('admin_audit_logs')
    .select('id, actor_user_id, action, resource_type, resource_id, occurred_at, context')
    .order('occurred_at', { ascending: false })
    .limit(query.limit)

  if (query.action) {
    auditQuery = auditQuery.eq('action', query.action)
  }

  if (query.resourceType) {
    auditQuery = auditQuery.eq('resource_type', query.resourceType)
  }

  if (query.actorUserId) {
    auditQuery = auditQuery.eq('actor_user_id', query.actorUserId)
  }

  if (query.from) {
    auditQuery = auditQuery.gte('occurred_at', query.from)
  }

  if (query.to) {
    auditQuery = auditQuery.lte('occurred_at', query.to)
  }

  const { data, error } = await auditQuery

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger le journal d’audit.')
  }

  return {
    data: data.map((entry) => ({
      id: entry.id,
      actorUserId: entry.actor_user_id,
      action: entry.action,
      resourceType: entry.resource_type,
      resourceId: entry.resource_id,
      occurredAt: entry.occurred_at,
      context: entry.context,
    })),
  }
})
