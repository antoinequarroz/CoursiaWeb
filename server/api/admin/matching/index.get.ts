import { ingredientProductMatchQuerySchema } from '#shared/validation/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, ingredientProductMatchQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = supabase
    .from('ingredient_product_matches')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(query.limit)

  if (query.ingredientId) request = request.eq('ingredient_id', query.ingredientId)
  if (query.productId) request = request.eq('product_id', query.productId)
  if (query.retailerId) request = request.eq('retailer_id', query.retailerId)
  if (query.status) request = request.eq('status', query.status)

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les correspondances.')
  }

  return { data }
})
