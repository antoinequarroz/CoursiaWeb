import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createError, getHeader, type H3Event } from 'h3'
import type { Database } from '#shared/supabase/database.types'

const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5
const DEFAULT_RATE_LIMIT_WINDOW_MS = 1000 * 60 * 60

export const normalizePublicEmail = (email: string) => email.trim().toLowerCase()

export const getPublicSubmissionFingerprint = (event: H3Event) => {
  const forwardedFor = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = getHeader(event, 'x-real-ip')?.trim()
  const userAgent = getHeader(event, 'user-agent')?.trim() ?? 'unknown'
  const ip = forwardedFor || realIp || event.node.req.socket.remoteAddress || 'unknown'

  return {
    userAgent,
    subjectHash: createHash('sha256').update(`${ip}|${userAgent}`).digest('hex'),
  }
}

export const enforcePublicSubmissionRateLimit = async (
  supabase: SupabaseClient<Database>,
  endpoint: string,
  subjectHash: string,
  options: {
    maxRequests?: number
    windowMs?: number
  } = {},
) => {
  const maxRequests = options.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS
  const windowMs = options.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS
  const now = new Date()
  const windowStartLimit = new Date(now.getTime() - windowMs)

  const { data: existingLimit, error: rateLimitReadError } = await supabase
    .from('public_submission_rate_limits')
    .select('requests, window_start')
    .eq('subject_hash', subjectHash)
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (rateLimitReadError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'La protection anti-abus est indisponible. Réessayez dans quelques instants.',
    })
  }

  const isCurrentWindow =
    existingLimit?.window_start && new Date(existingLimit.window_start) > windowStartLimit

  if (existingLimit && isCurrentWindow && existingLimit.requests >= maxRequests) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Trop de tentatives. Réessayez dans environ une heure.',
    })
  }

  const { error: rateLimitWriteError } = await supabase
    .from('public_submission_rate_limits')
    .upsert(
      {
        subject_hash: subjectHash,
        endpoint,
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

  return now
}
