import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import {
  isLikelyAutomatedSubmission,
  waitlistRequestSchema,
} from '#shared/validation/public-engagement'

const RATE_LIMIT_ENDPOINT = 'public.waitlist'
const RATE_LIMIT_MAX_REQUESTS = 5
const RATE_LIMIT_WINDOW_MS = 1000 * 60 * 60

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const getClientFingerprint = (event: H3Event) => {
  const forwardedFor = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = getHeader(event, 'x-real-ip')?.trim()
  const userAgent = getHeader(event, 'user-agent')?.trim() ?? 'unknown'
  const ip = forwardedFor || realIp || event.node.req.socket.remoteAddress || 'unknown'

  return {
    userAgent,
    subjectHash: createHash('sha256').update(`${ip}|${userAgent}`).digest('hex'),
  }
}

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
  const now = new Date()
  const windowStartLimit = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)
  const { subjectHash, userAgent } = getClientFingerprint(event)

  const { data: existingLimit, error: rateLimitReadError } = await serviceRoleClient
    .from('public_submission_rate_limits')
    .select('requests, window_start')
    .eq('subject_hash', subjectHash)
    .eq('endpoint', RATE_LIMIT_ENDPOINT)
    .maybeSingle()

  if (rateLimitReadError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'La protection anti-abus est indisponible. Réessayez dans quelques instants.',
    })
  }

  const isCurrentWindow =
    existingLimit?.window_start && new Date(existingLimit.window_start) > windowStartLimit

  if (existingLimit && isCurrentWindow && existingLimit.requests >= RATE_LIMIT_MAX_REQUESTS) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de tentatives. Réessayez dans environ une heure.',
    })
  }

  const { error: rateLimitWriteError } = await serviceRoleClient
    .from('public_submission_rate_limits')
    .upsert(
      {
        subject_hash: subjectHash,
        endpoint: RATE_LIMIT_ENDPOINT,
        requests: existingLimit && isCurrentWindow ? existingLimit.requests + 1 : 1,
        window_start: existingLimit && isCurrentWindow ? existingLimit.window_start : now.toISOString(),
      },
      { onConflict: 'subject_hash,endpoint' },
    )

  if (rateLimitWriteError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'La protection anti-abus est indisponible. Réessayez dans quelques instants.',
    })
  }

  const email = normalizeEmail(parsed.data.email)
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
