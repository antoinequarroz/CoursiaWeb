import { communitySubmissionQuerySchema } from '#shared/validation/community-moderation'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireCommunityModerationReadAccess(admin.role)

  const query = await getValidatedQuery(event, communitySubmissionQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('community_recipe_moderation_decisions')
    .select('*')
    .order('decided_at', { ascending: false })
    .limit(query.limit)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les decisions de moderation.')
  }

  return { data }
})
