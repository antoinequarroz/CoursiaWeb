import {
  contactRequestSchema,
  isLikelyAutomatedSubmission,
} from '#shared/validation/public-engagement'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = contactRequestSchema.safeParse(body)

  if (!parsed.success || isLikelyAutomatedSubmission(Number(body?.submittedAt))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'La demande est invalide. Vérifiez les champs et réessayez.',
    })
  }

  return {
    ok: true,
    message: 'Votre message a bien été reçu. Nous reviendrons vers vous dès que possible.',
    data: {
      email: parsed.data.email,
      reason: parsed.data.reason,
      source: parsed.data.source,
      consent: parsed.data.consent,
    },
  }
})

