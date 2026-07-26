import {
  isLikelyAutomatedSubmission,
  waitlistRequestSchema,
} from '#shared/validation/public-engagement'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = waitlistRequestSchema.safeParse(body)

  if (!parsed.success || isLikelyAutomatedSubmission(Number(body?.submittedAt))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'L’inscription est invalide. Vérifiez les champs et réessayez.',
    })
  }

  return {
    ok: true,
    message: 'Inscription confirmée. Votre consentement et la source ont été pris en compte.',
    data: {
      email: parsed.data.email,
      source: parsed.data.source,
      consent: parsed.data.consent,
      interests: parsed.data.interests,
    },
  }
})

