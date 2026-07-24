import type { H3Event } from 'h3'
import type { AdminRole } from '#shared/auth/permissions'

export type SensitiveAdminContext = {
  userId: string
  role: AdminRole
}

export const getSensitiveAdminContext = async (event: H3Event): Promise<SensitiveAdminContext> => {
  const supabase = createSupabaseServerClient(event)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throwApiError('AUTH_REQUIRED', 'Authentification administrateur requise.')
  }

  const { data: roleAssignment, error: roleError } = await supabase
    .from('admin_role_assignments')
    .select('role')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .maybeSingle()

  if (roleError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de vérifier les permissions administrateur.')
  }

  if (!roleAssignment) {
    throwApiError('FORBIDDEN', 'Permission administrateur insuffisante.')
  }

  return {
    userId: user.id,
    role: roleAssignment.role,
  }
}
