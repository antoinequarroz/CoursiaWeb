export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireContentSettingsAccess(admin.role)

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .order('critical', { ascending: false })
    .order('key', { ascending: true })

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger les feature flags.')
  }

  return { data }
})
