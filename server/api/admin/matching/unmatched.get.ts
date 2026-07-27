import { findUnmatchedIngredients } from '#shared/validation/ingredient-product-matching'
import { mobileTable, toAdminIngredientRow } from '../../../utils/mobile-admin-mapping'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const supabase = createSupabaseServiceRoleClient()
  const [{ data: ingredients, error: ingredientError }, { data: products, error: productError }] = await Promise.all([
    mobileTable(supabase, 'ingredients').select('id,nom,rayon,unite_defaut,created_at').limit(500),
    mobileTable(supabase, 'produits_canoniques').select('ingredient_id').limit(5000),
  ])

  if (ingredientError || productError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les ingrédients sans correspondance.')
  }

  const ingredientRows = Array.isArray(ingredients) ? ingredients as Array<Record<string, unknown>> : []
  const productRows = Array.isArray(products) ? products as Array<Record<string, unknown>> : []
  const unmatched = findUnmatchedIngredients(
    ingredientRows.map((ingredient) => ({ id: String(ingredient.id) })),
    productRows
      .filter((product) => product.ingredient_id)
      .map((product) => ({
        ingredientId: String(product.ingredient_id),
        status: 'confirmed',
      })),
  )
  const unmatchedIds = new Set(unmatched.map((item) => item.id))

  return {
    data: ingredientRows
      .filter((ingredient) => unmatchedIds.has(String(ingredient.id)))
      .map(toAdminIngredientRow),
  }
})
