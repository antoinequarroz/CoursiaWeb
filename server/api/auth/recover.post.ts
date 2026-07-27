import { passwordRecoverySchema } from '#shared/validation/auth'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')

  const body = await readBody(event)
  const parsed = passwordRecoverySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email invalide.',
    })
  }

  const config = useRuntimeConfig()
  const supabase = createSupabaseServerClient(event)
  const redirectTo = `${config.public.siteUrl}/auth/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  })

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Impossible d envoyer l email de reinitialisation.',
    })
  }

  return {
    ok: true,
  }
})
