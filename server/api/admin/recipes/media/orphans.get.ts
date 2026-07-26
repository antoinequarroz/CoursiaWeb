export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeMediaAccess(admin.role)

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('recipe_media_assets')
    .select('*')
    .or('recipe_id.is.null,status.eq.orphaned')
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les fichiers orphelins.')
  }

  return { data }
})

