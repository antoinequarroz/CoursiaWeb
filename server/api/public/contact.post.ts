import {
  contactRequestSchema,
  isLikelyAutomatedSubmission,
} from '#shared/validation/public-engagement'

const RATE_LIMIT_ENDPOINT = 'public.contact'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = contactRequestSchema.safeParse(body)

  if (!parsed.success || isLikelyAutomatedSubmission(Number(body?.submittedAt))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La demande est invalide. Vérifiez les champs et réessayez.',
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
  const { data: contactSubmission, error: contactError } = await serviceRoleClient
    .from('contact_submissions')
    .insert({
      name: parsed.data.name.trim(),
      email,
      reason: parsed.data.reason.trim(),
      message: parsed.data.message.trim(),
      source: parsed.data.source,
      status: 'new',
      consented_at: now.toISOString(),
      updated_at: now.toISOString(),
      user_agent: userAgent.slice(0, 500),
      ip_hash: subjectHash,
    })
    .select('id, email, reason, source, created_at')
    .single()

  if (contactError || !contactSubmission) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Votre message n’a pas pu être enregistré. Réessayez dans quelques instants.',
    })
  }

  return {
    ok: true,
    message: 'Votre message a bien été reçu. Nous reviendrons vers vous dès que possible.',
    data: {
      id: contactSubmission.id,
      email: contactSubmission.email,
      reason: contactSubmission.reason,
      source: contactSubmission.source,
    },
  }
})
