import { z } from 'zod'

export const adminRoleAssignmentParamsSchema = z.object({
  id: z.uuid(),
})

export const revokeAdminRoleAssignmentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
})

export const adminAuditActionSchema = z.enum([
  'create',
  'update',
  'publish',
  'archive',
  'moderate',
  'role_change',
])

export const adminAuditResourceTypeSchema = z.enum([
  'course',
  'official_recipe',
  'canonical_ingredient',
  'admin_role_assignment',
  'moderation_case',
  'support_case',
  'admin_settings',
])

export const adminAuditLogQuerySchema = z
  .object({
    action: adminAuditActionSchema.optional(),
    resourceType: adminAuditResourceTypeSchema.optional(),
    actorUserId: z.uuid().optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine(
    (value) => !value.from || !value.to || new Date(value.from) <= new Date(value.to),
    {
      message: '`from` must be before or equal to `to`.',
      path: ['from'],
    },
  )

export type AdminRoleAssignmentParams = z.infer<typeof adminRoleAssignmentParamsSchema>
export type RevokeAdminRoleAssignmentInput = z.infer<typeof revokeAdminRoleAssignmentSchema>
export type AdminAuditAction = z.infer<typeof adminAuditActionSchema>
export type AdminAuditResourceType = z.infer<typeof adminAuditResourceTypeSchema>
export type AdminAuditLogQuery = z.infer<typeof adminAuditLogQuerySchema>
