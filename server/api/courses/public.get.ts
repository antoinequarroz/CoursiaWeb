import { courseListQuerySchema } from '#shared/validation/course'
import { buildPublicCoursesQuery } from '#shared/supabase/queries/courses'

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, courseListQuerySchema.parse)
  const supabase = createSupabaseServerClient(event)
  const { data, error } = await buildPublicCoursesQuery(supabase, query)

  if (error) {
    throw createError({
      statusCode: 502,
      statusMessage: error.message,
    })
  }

  return { data }
})
