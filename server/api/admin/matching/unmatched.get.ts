import { findUnmatchedIngredients } from '#shared/validation/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const supabase = createSupabaseServiceRoleClient()
  const [{ data: ingredients, error: ingredientError }, { data: matches, error: matchError }] = await Promise.all([
    supabase.from('canonical_ingredients').select('id,name,slug,units').eq('status', 'active').limit(500),
    supabase.from('ingredient_product_matches').select('ingredient_id,status').neq('status', 'rejected').limit(5000),
  ])

  if (ingredientError || matchError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les ingrÃ©dients sans correspondance.')
  }

  const unmatched = findUnmatchedIngredients(
    (ingredients ?? []).map((ingredient) => ({ id: ingredient.id })),
    (matches ?? []).map((match) => ({
      ingredientId: match.ingredient_id,
      status: match.status,
    })),
  )

  return {
    data: (ingredients ?? []).filter((ingredient) =>
      unmatched.some((item) => item.id === ingredient.id),
    ),
  }
})
