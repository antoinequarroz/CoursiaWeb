export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')

  const supabase = createSupabaseServerClient(event)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      authenticated: false,
      user: null,
    }
  }

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  }
})
