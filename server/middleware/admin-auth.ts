import { buildAdminLoginRedirect, isAdminRoute } from '#shared/auth/admin-route'
import { isE2eAdminAuthBypassAllowed } from '#shared/security/admin-auth-bypass'

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? '/'

  if (!isAdminRoute(path)) {
    return
  }

  if (isE2eAdminAuthBypassAllowed()) {
    setHeader(event, 'Cache-Control', 'private, no-store')
    return
  }

  setHeader(event, 'Cache-Control', 'private, no-store')

  const supabase = createSupabaseServerClient(event)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error && user) {
    const accessToken = getSupabaseAccessTokenFromCookies(event)

    if (!accessToken) {
      return sendRedirect(event, buildAdminLoginRedirect(event.path), 302)
    }

    const userScopedSupabase = createSupabaseUserScopedClient(accessToken)
    const { data: roleAssignment } = await userScopedSupabase
      .from('admin_role_assignments')
      .select('role')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .maybeSingle()

    if (roleAssignment) {
      return
    }
  }

  return sendRedirect(event, buildAdminLoginRedirect(event.path), 302)
})
