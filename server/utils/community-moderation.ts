import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '#shared/supabase/database.types'
import type {
  CommunityModerationDecisionInput,
  CommunitySubmissionInput,
} from '#shared/validation/community-moderation'
import {
  getCommunitySubmissionAgeDays,
  getCommunitySubmissionMissingChecks,
  mapDecisionToStatus,
} from '#shared/validation/community-moderation'

type SubmissionRow = Database['public']['Tables']['community_recipe_submissions']['Row']

export const requireCommunityModerationReadAccess = (role: string) => {
  if (!['editor', 'moderator', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'Permission insuffisante pour consulter la file de moderation.')
  }
}

export const requireCommunityModerationDecisionAccess = (role: string) => {
  if (!['moderator', 'administrator', 'super_administrator'].includes(role)) {
    throwApiError('FORBIDDEN', 'La decision de moderation est reservee aux moderateurs.')
  }
}

export const toCommunitySubmissionRow = (input: CommunitySubmissionInput) => ({
  title: input.title,
  author_user_id: input.authorUserId ?? null,
  status: input.status,
  priority: input.priority,
  recipe_payload: input.recipePayload as unknown as Json,
  photo_asset_id: input.photoAssetId ?? null,
  source: input.source,
  rights: input.rights,
  allergens: input.allergens,
  checklist: input.checklist as unknown as Json,
  updated_at: new Date().toISOString(),
  resolved_at: ['accepted', 'rejected', 'archived'].includes(input.status) ? new Date().toISOString() : null,
})

export const enrichCommunitySubmission = (submission: SubmissionRow) => {
  const checklist = submission.checklist && typeof submission.checklist === 'object' && !Array.isArray(submission.checklist)
    ? submission.checklist as Record<string, boolean>
    : {
        recipeChecked: false,
        photoChecked: false,
        sourceChecked: false,
        rightsChecked: false,
        allergensChecked: false,
      }

  return {
    ...submission,
    ageDays: getCommunitySubmissionAgeDays(submission.submitted_at),
    missingChecks: getCommunitySubmissionMissingChecks({
      recipeChecked: Boolean(checklist.recipeChecked),
      photoChecked: Boolean(checklist.photoChecked),
      sourceChecked: Boolean(checklist.sourceChecked),
      rightsChecked: Boolean(checklist.rightsChecked),
      allergensChecked: Boolean(checklist.allergensChecked),
    }),
  }
}

export const getCommunitySubmissionById = async (
  client: SupabaseClient<Database>,
  id: string,
) => {
  const { data, error } = await client
    .from('community_recipe_submissions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger la soumission communautaire.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Soumission communautaire introuvable.')
  }

  return data
}

export const applyCommunityModerationDecision = async (
  client: SupabaseClient<Database>,
  input: {
    submission: SubmissionRow
    decision: CommunityModerationDecisionInput
    moderatorUserId: string
  },
) => {
  const nextStatus = mapDecisionToStatus(input.decision.decision)
  const now = new Date().toISOString()
  const { data, error } = await client
    .from('community_recipe_submissions')
    .update({
      status: nextStatus,
      checklist: input.decision.checklist as unknown as Json,
      updated_at: now,
      resolved_at: ['accepted', 'rejected', 'archived'].includes(nextStatus) ? now : null,
    })
    .eq('id', input.submission.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de mettre a jour la soumission.')
  }

  const { data: decision, error: decisionError } = await client
    .from('community_recipe_moderation_decisions')
    .insert({
      submission_id: input.submission.id,
      decision: input.decision.decision,
      reason: input.decision.reason ?? null,
      checklist: input.decision.checklist as unknown as Json,
      decided_by: input.moderatorUserId,
    })
    .select('*')
    .single()

  if (decisionError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d auditer la decision de moderation.')
  }

  return { submission: data, decision }
}
