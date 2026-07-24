export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')

  const supabase = createSupabaseServerClient(event)
  await supabase.auth.signOut()

  return { ok: true }
})
