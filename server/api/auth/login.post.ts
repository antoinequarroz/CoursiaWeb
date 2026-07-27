import { adminLoginSchema } from '#shared/validation/auth'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')

  const body = await readBody(event)
  const parsed = adminLoginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Identifiants invalides.',
    })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user || !data.session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Connexion impossible avec ces identifiants.',
    })
  }

  const userScopedSupabase = createSupabaseUserScopedClient(data.session.access_token)
  const { data: roleAssignment, error: roleError } = await userScopedSupabase
    .from('admin_role_assignments')
    .select('role')
    .eq('user_id', data.user.id)
    .is('revoked_at', null)
    .single()

  if (roleError || !roleAssignment) {
    await supabase.auth.signOut()
    throw createError({
      statusCode: 403,
      statusMessage: 'Accès administrateur refusé.',
    })
  }

  return {
    ok: true,
    redirect: parsed.data.redirect,
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    role: roleAssignment.role,
  }
})
