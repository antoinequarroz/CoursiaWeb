import { ingredientProductMatchQuerySchema } from '#shared/validation/ingredient-product-matching'
import { mobileTable } from '../../../utils/mobile-admin-mapping'
import { toVirtualIngredientProductMatch } from '../../../utils/ingredient-product-matching'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, ingredientProductMatchQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = mobileTable(supabase, 'produits_canoniques')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(query.limit)

  if (query.ingredientId) request = request.eq('ingredient_id', query.ingredientId)
  if (query.productId) request = request.eq('id', query.productId)
  if (query.status === 'confirmed') request = request.not('ingredient_id', 'is', null)
  if (query.status === 'ambiguous') request = request.is('ingredient_id', null)

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les correspondances.')
  }

  const productRows = Array.isArray(data) ? data as Array<Record<string, unknown>> : []
  const matches = await Promise.all(productRows.map(async (product) => {
    const { data: offer } = await mobileTable(supabase, 'offres_magasin')
      .select('*')
      .eq('produit_canonique_id', product.id)
      .limit(1)
      .maybeSingle()

    return toVirtualIngredientProductMatch(product, offer as Record<string, unknown> | null)
  }))

  return {
    data: query.retailerId
      ? matches.filter((match) => match.retailer_id === query.retailerId)
      : matches,
  }
})
