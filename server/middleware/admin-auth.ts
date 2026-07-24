import { buildAdminLoginRedirect, isAdminRoute } from '#shared/auth/admin-route'

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? '/'

  if (!isAdminRoute(path)) {
    return
  }

  setHeader(event, 'Cache-Control', 'private, no-store')

  const supabase = createSupabaseServerClient(event)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error && user) {
    const { data: roleAssignment } = await supabase
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
