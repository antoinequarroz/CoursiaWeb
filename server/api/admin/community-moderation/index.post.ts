import { communitySubmissionSchema } from '#shared/validation/community-moderation'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireCommunityModerationReadAccess(admin.role)

  const body = await readBody(event)
  const parsed = communitySubmissionSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('community_recipe_submissions')
    .insert(toCommunitySubmissionRow(parsed.data))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de creer la soumission communautaire.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'community_recipe_submission',
    resourceId: data.id,
    context: { title: data.title, priority: data.priority, status: data.status },
  })

  return { data: enrichCommunitySubmission(data) }
})
