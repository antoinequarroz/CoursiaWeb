import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '#shared/supabase/database.types'
import type { AuthenticatedEnrollmentsQuery, CourseListQuery } from '#shared/validation/course'

export const buildPublicCoursesQuery = (
  supabase: SupabaseClient<Database>,
  query: CourseListQuery,
) => {
  return supabase
    .from('courses')
    .select('id, slug, title, excerpt, created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(query.limit)
}

export const buildAuthenticatedEnrollmentsQuery = (
  supabase: SupabaseClient<Database>,
  userId: string,
  query: AuthenticatedEnrollmentsQuery,
) => {
  const request = supabase
    .from('enrollments')
    .select('id, status, created_at, course:courses(id, slug, title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return query.status ? request.eq('status', query.status) : request
}
