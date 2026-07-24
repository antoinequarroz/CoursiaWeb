import { authenticatedEnrollmentsQuerySchema } from '#shared/validation/course'
import { buildAuthenticatedEnrollmentsQuery } from '#shared/supabase/queries/courses'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, authenticatedEnrollmentsQuerySchema.parse)
  const supabase = createSupabaseServerClient(event)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentification requise.',
    })
  }

  const { data, error } = await buildAuthenticatedEnrollmentsQuery(supabase, user.id, query)

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error.message,
    })
  }

  return { data }
})
