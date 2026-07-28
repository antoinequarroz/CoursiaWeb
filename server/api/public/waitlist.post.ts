import {
  isLikelyAutomatedSubmission,
  waitlistRequestSchema,
} from '#shared/validation/public-engagement'

const RATE_LIMIT_ENDPOINT = 'public.waitlist'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = waitlistRequestSchema.safeParse(body)

  if (!parsed.success || isLikelyAutomatedSubmission(Number(body?.submittedAt))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'L’inscription est invalide. Vérifiez les champs et réessayez.',
    })
  }

  const serviceRoleClient = createSupabaseServiceRoleClient()
  const { subjectHash, userAgent } = getPublicSubmissionFingerprint(event)
  const now = await enforcePublicSubmissionRateLimit(
    serviceRoleClient,
    RATE_LIMIT_ENDPOINT,
    subjectHash,
  )

  const email = normalizePublicEmail(parsed.data.email)
  const { data: waitlistEntry, error: waitlistError } = await serviceRoleClient
    .from('waitlist')
    .upsert(
      {
        email,
        source: parsed.data.source,
        household_size: parsed.data.householdSize ?? null,
        interests: parsed.data.interests,
        consented_at: now.toISOString(),
        updated_at: now.toISOString(),
        user_agent: userAgent.slice(0, 500),
        ip_hash: subjectHash,
      },
      { onConflict: 'email' },
    )
    .select('id, email, source, created_at, updated_at')
    .single()

  if (waitlistError || !waitlistEntry) {
    throw createError({
      statusCode: 500,
      statusMessage: 'L’inscription n’a pas pu être enregistrée. Réessayez dans quelques instants.',
    })
  }

  return {
    ok: true,
    message: 'Inscription confirmée. Votre email et votre consentement sont enregistrés.',
    data: {
      id: waitlistEntry.id,
      email: waitlistEntry.email,
      source: waitlistEntry.source,
    },
  }
})
