import { canonicalIngredientListQuerySchema } from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireIngredientWriteAccess(admin.role)

  const query = await getValidatedQuery(event, canonicalIngredientListQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = mobileTable(supabase, 'ingredients')
    .select('*')
    .order('nom', { ascending: true })
    .limit(query.limit)

  if (query.search) {
    request = request.or(`nom.ilike.%${query.search}%,rayon.ilike.%${query.search}%`)
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les ingrédients mobile.')
  }

  return { data: Array.isArray(data) ? data.map(toAdminIngredientRow) : [] }
})
