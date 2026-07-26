import { featureFlagSchema } from '#shared/validation/content-settings'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  const body = await readBody(event)
  const parsed = featureFlagSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  requireFeatureFlagAccess(admin.role, parsed.data.critical)

  const supabase = createSupabaseServiceRoleClient()
  const row = toFeatureFlagRow(parsed.data)
  const { data, error } = await supabase
    .from('feature_flags')
    .upsert(row, { onConflict: 'key' })
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier le feature flag.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'feature_flag',
    resourceId: data.id,
    context: {
      key: data.key,
      enabled: data.enabled,
      critical: data.critical,
      rolloutPercentage: data.rollout_percentage,
      reason: parsed.data.reason ?? null,
    },
  })

  return { data }
})
