import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeAuditContext, type AdminAuditLogInput } from '#shared/admin/audit'
import type { Database } from '#shared/supabase/database.types'


export const writeAdminAuditLog = async (
  serviceRoleClient: SupabaseClient<Database>,
  input: AdminAuditLogInput,
) => {
  const { error } = await serviceRoleClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId,
    context: sanitizeAuditContext(input.context),
  })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de journaliser l’action administrative.')
  }
}
