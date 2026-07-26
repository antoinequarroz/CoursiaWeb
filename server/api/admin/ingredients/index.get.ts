import { canonicalIngredientListQuerySchema } from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireIngredientWriteAccess(admin.role)

  const query = await getValidatedQuery(event, canonicalIngredientListQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = supabase
    .from('canonical_ingredients')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(query.limit)

  if (query.search) {
    request = request.or(`name.ilike.%${query.search}%,slug.ilike.%${query.search}%`)
  }
  if (query.status) {
    request = request.eq('status', query.status)
  }
  if (query.allergen) {
    request = request.contains('allergens', [query.allergen])
  }
  if (query.diet) {
    request = request.contains('diets', [query.diet])
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les ingrédients canoniques.')
  }

  return { data }
})

