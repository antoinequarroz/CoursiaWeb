import type { SupabaseClient } from '@supabase/supabase-js'
import { sanitizeAuditContext, type AdminAuditLogInput } from '#shared/admin/audit'
import type { Database } from '#shared/supabase/database.types'

const allowedDatabaseResourceTypes = new Set([
  'course',
  'admin_role_assignment',
  'moderation_case',
  'support_case',
  'admin_settings',
])

const toDatabaseResourceType = (resourceType: string) => {
  if (allowedDatabaseResourceTypes.has(resourceType)) {
    return resourceType
  }

  if (
    [
      'official_recipe',
      'canonical_ingredient',
      'recipe_media_asset',
      'retailer',
      'product',
      'price_entry',
      'ingredient_product_match',
    ].includes(resourceType)
  ) {
    return 'course'
  }

  if (
    [
      'community_recipe_submission',
      'community_moderation_decision',
    ].includes(resourceType)
  ) {
    return 'moderation_case'
  }

  if (
    [
      'support_user_lookup',
      'support_user_procedure',
    ].includes(resourceType)
  ) {
    return 'support_case'
  }

  return 'admin_settings'
}

export const writeAdminAuditLog = async (
  serviceRoleClient: SupabaseClient<Database>,
  input: AdminAuditLogInput,
) => {
  const databaseResourceType = toDatabaseResourceType(input.resourceType)
  const { error } = await serviceRoleClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    resource_type: databaseResourceType as AdminAuditLogInput['resourceType'],
    resource_id: input.resourceId,
    context: sanitizeAuditContext({
      originalResourceType: databaseResourceType === input.resourceType ? undefined : input.resourceType,
      ...input.context,
    }),
  })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de journaliser l’action administrative.')
  }
}
