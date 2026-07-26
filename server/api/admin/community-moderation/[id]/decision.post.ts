import {
  communityModerationDecisionInputSchema,
  communitySubmissionParamsSchema,
} from '#shared/validation/community-moderation'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireCommunityModerationDecisionAccess(admin.role)

  const params = await getValidatedRouterParams(event, communitySubmissionParamsSchema.parse)
  const body = await readBody(event)
  const parsed = communityModerationDecisionInputSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const existing = await getCommunitySubmissionById(supabase, params.id)
  const result = await applyCommunityModerationDecision(supabase, {
    submission: existing,
    decision: parsed.data,
    moderatorUserId: admin.userId,
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'moderate',
    resourceType: 'community_moderation_decision',
    resourceId: result.decision.id,
    context: {
      submissionId: existing.id,
      fromStatus: existing.status,
      toStatus: result.submission.status,
      decision: result.decision.decision,
      hasReason: Boolean(result.decision.reason),
    },
  })

  return {
    data: enrichCommunitySubmission(result.submission),
    decision: result.decision,
  }
})
