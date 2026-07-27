import { sanitizeAdminRedirect } from '#shared/auth/redirect'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')

  const query = getQuery(event)
  const code = typeof query.code === 'string' ? query.code : null
  const rawRedirect = typeof query.redirect === 'string' ? query.redirect : ''
  const isRecovery = query.type === 'recovery' || rawRedirect.startsWith('/auth/reset-password')
  const redirect = isRecovery ? '/auth/reset-password' : sanitizeAdminRedirect(query.redirect)

  if (!code) {
    return sendRedirect(event, `/auth/login?redirect=${encodeURIComponent(redirect)}`)
  }

  const supabase = createSupabaseServerClient(event)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return sendRedirect(
      event,
      `/auth/login?redirect=${encodeURIComponent(redirect)}&error=auth_failed`,
    )
  }

  return sendRedirect(event, redirect)
})
