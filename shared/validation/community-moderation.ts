import { z } from 'zod'

export const communitySubmissionStatusSchema = z.enum([
  'pending',
  'correction_requested',
  'accepted',
  'rejected',
  'archived',
])

export const communitySubmissionPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])
export const communityModerationDecisionSchema = z.enum(['accept', 'reject', 'request_correction', 'archive'])

export const communityModerationChecklistSchema = z.object({
  recipeChecked: z.boolean(),
  photoChecked: z.boolean(),
  sourceChecked: z.boolean(),
  rightsChecked: z.boolean(),
  allergensChecked: z.boolean(),
})

export const communitySubmissionSchema = z.object({
  title: z.string().trim().min(1).max(180),
  authorUserId: z.uuid().optional(),
  status: communitySubmissionStatusSchema.default('pending'),
  priority: communitySubmissionPrioritySchema.default('normal'),
  recipePayload: z.record(z.string(), z.unknown()).default({}),
  photoAssetId: z.uuid().optional(),
  source: z.string().trim().min(1).max(300),
  rights: z.string().trim().min(1).max(500),
  allergens: z.array(z.string().trim().min(1).max(80)).default([]),
  checklist: communityModerationChecklistSchema.default({
    recipeChecked: false,
    photoChecked: false,
    sourceChecked: false,
    rightsChecked: false,
    allergensChecked: false,
  }),
})

export const communitySubmissionQuerySchema = z.object({
  status: communitySubmissionStatusSchema.optional(),
  priority: communitySubmissionPrioritySchema.optional(),
  oldestFirst: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const communitySubmissionParamsSchema = z.object({
  id: z.uuid(),
})

export const communityModerationDecisionInputSchema = z
  .object({
    decision: communityModerationDecisionSchema,
    reason: z.string().trim().max(1000).optional(),
    checklist: communityModerationChecklistSchema,
  })
  .superRefine((value, context) => {
    if (value.decision === 'reject' && !value.reason) {
      context.addIssue({
        code: 'custom',
        path: ['reason'],
        message: 'Une raison est obligatoire pour le refus.',
      })
    }

    if (value.decision === 'accept' && Object.values(value.checklist).some((checked) => !checked)) {
      context.addIssue({
        code: 'custom',
        path: ['checklist'],
        message: 'Toutes les verifications doivent etre terminees avant acceptation.',
      })
    }
  })

export const getCommunitySubmissionAgeDays = (submittedAt: string, now = new Date()) => {
  const submitted = new Date(submittedAt).getTime()

  if (Number.isNaN(submitted)) {
    return 0
  }

  return Math.max(0, Math.floor((now.getTime() - submitted) / (24 * 60 * 60 * 1000)))
}

export const getCommunitySubmissionMissingChecks = (
  checklist: z.infer<typeof communityModerationChecklistSchema>,
) =>
  Object.entries(checklist)
    .filter(([, checked]) => !checked)
    .map(([key]) => key)

export const mapDecisionToStatus = (
  decision: z.infer<typeof communityModerationDecisionSchema>,
): z.infer<typeof communitySubmissionStatusSchema> => {
  if (decision === 'accept') return 'accepted'
  if (decision === 'reject') return 'rejected'
  if (decision === 'request_correction') return 'correction_requested'
  return 'archived'
}

export type CommunitySubmissionInput = z.infer<typeof communitySubmissionSchema>
export type CommunityModerationDecisionInput = z.infer<typeof communityModerationDecisionInputSchema>
