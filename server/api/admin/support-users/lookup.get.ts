import { supportUserSearchSchema } from '#shared/validation/support-users'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSupportUserReadAccess(admin.role)

  const query = await getValidatedQuery(event, supportUserSearchSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const profile = await findSupportUserProfile(supabase, query)
  const events = await getRevenueCatEventsForSupport(supabase, profile.user_id)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'support_user_lookup',
    resourceId: profile.user_id,
    context: redactSupportAuditContext(profile),
  })

  return {
    data: sanitizeSupportProfile(profile),
    revenueCatEvents: events,
    sensitiveDataMasked: true,
    impersonationEnabled: false,
  }
})
