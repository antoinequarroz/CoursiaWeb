import { communitySubmissionQuerySchema } from '#shared/validation/community-moderation'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireCommunityModerationReadAccess(admin.role)

  const query = await getValidatedQuery(event, communitySubmissionQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = supabase
    .from('community_recipe_submissions')
    .select('*')
    .order('priority', { ascending: false })
    .order('submitted_at', { ascending: query.oldestFirst })
    .limit(query.limit)

  if (query.status) request = request.eq('status', query.status)
  if (query.priority) request = request.eq('priority', query.priority)

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister la file de moderation communautaire.')
  }

  return { data: (data ?? []).map(enrichCommunitySubmission) }
})
