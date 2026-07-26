import { ingredientProductMatchQuerySchema } from '#shared/validation/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, ingredientProductMatchQuerySchema.parse)

  if (!query.ingredientId) {
    throwApiError('INVALID_REQUEST', 'ingredientId est requis pour calculer lâ€™impact.')
  }

  const supabase = createSupabaseServiceRoleClient()
  const impact = await buildIngredientMatchingImpact(supabase, query.ingredientId)

  return { data: impact }
})
