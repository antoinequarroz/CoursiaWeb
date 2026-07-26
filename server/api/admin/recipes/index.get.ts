import { officialRecipeListQuerySchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const query = await getValidatedQuery(event, officialRecipeListQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = supabase.from('official_recipes').select('*').order('updated_at', { ascending: false }).limit(query.limit)

  if (query.search) {
    request = request.or(`title.ilike.%${query.search}%,slug.ilike.%${query.search}%`)
  }

  if (query.status) {
    request = request.eq('status', query.status)
  }

  if (query.difficulty) {
    request = request.eq('difficulty', query.difficulty)
  }

  if (query.category) {
    request = request.contains('categories', [query.category])
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les recettes officielles.')
  }

  return { data }
})

