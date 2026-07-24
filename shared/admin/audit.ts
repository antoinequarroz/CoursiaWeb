import type { Json } from '#shared/supabase/database.types'
import type { AdminAuditAction, AdminAuditResourceType } from '#shared/validation/admin'

export type AdminAuditContext = Record<string, Json | undefined>

export type AdminAuditLogInput = {
  actorUserId: string
  action: AdminAuditAction
  resourceType: AdminAuditResourceType
  resourceId: string
  context?: AdminAuditContext
}

const sensitiveContextKeys = new Set([
  'access_token',
  'authorization',
  'cookie',
  'password',
  'refresh_token',
  'secret',
  'service_role',
  'token',
])

export const sanitizeAuditContext = (context: AdminAuditContext = {}) => {
  return Object.fromEntries(
    Object.entries(context).filter(([key, value]) => {
      const normalizedKey = key.toLowerCase()

      return value !== undefined && !sensitiveContextKeys.has(normalizedKey)
    }),
  ) as Record<string, Json>
}
