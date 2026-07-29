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
  const productIds = productRows.map((product) => String(product.id))
  const ingredientIds = Array.from(new Set(productRows.map((product) => String(product.ingredient_id ?? '')).filter(Boolean)))
  const offersByProductId = new Map<string, Array<Record<string, unknown>>>()
  const ingredientById = new Map<string, { id: string; name: string; aisle: string }>()
  const retailerById = new Map<string, { id: string; name: string; slug: string }>()

  if (productIds.length > 0) {
    const { data: offers, error: offersError } = await mobileTable(supabase, 'offres_magasin')
      .select('id, produit_canonique_id, enseigne_id, format, quantite, unite, actif')
      .in('produit_canonique_id', productIds)
      .limit(5000)

    if (offersError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les offres des correspondances.')
    }

    const offerRows = Array.isArray(offers) ? offers as Array<Record<string, unknown>> : []
    const retailerIds = Array.from(new Set(offerRows.map((offer) => String(offer.enseigne_id ?? '')).filter(Boolean)))

    for (const offer of offerRows) {
      const productId = String(offer.produit_canonique_id ?? '')
      const current = offersByProductId.get(productId) ?? []
      current.push(offer)
      offersByProductId.set(productId, current)
    }

    if (retailerIds.length > 0) {
      const { data: retailers, error: retailersError } = await mobileTable(supabase, 'enseignes')
        .select('id, nom, code')
        .in('id', retailerIds)
        .limit(500)

      if (retailersError) {
        throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les enseignes des correspondances.')
      }

      for (const retailer of Array.isArray(retailers) ? retailers as Array<Record<string, unknown>> : []) {
        const id = String(retailer.id)
        retailerById.set(id, { id, name: String(retailer.nom ?? ''), slug: String(retailer.code ?? '') })
      }
    }
  }

  if (ingredientIds.length > 0) {
    const { data: ingredients, error: ingredientsError } = await mobileTable(supabase, 'ingredients')
      .select('id, nom, rayon')
      .in('id', ingredientIds)
      .limit(5000)

    if (ingredientsError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les ingrédients liés.')
    }

    for (const ingredient of Array.isArray(ingredients) ? ingredients as Array<Record<string, unknown>> : []) {
      const id = String(ingredient.id)
      ingredientById.set(id, { id, name: String(ingredient.nom ?? ''), aisle: String(ingredient.rayon ?? '') })
    }
  }

  const matches = productRows.flatMap((product) => {
    const offers = offersByProductId.get(String(product.id)) ?? [null]

    return offers.map((offer) => {
      const match = toVirtualIngredientProductMatch(product, offer)
      const ingredient = match.ingredient_id ? ingredientById.get(match.ingredient_id) : undefined
      const retailer = match.retailer_id ? retailerById.get(match.retailer_id) : undefined

      return {
        ...match,
        product_name: String(product.nom ?? ''),
        product_aisle: String(product.rayon ?? ''),
        ingredient_name: ingredient?.name ?? null,
        ingredient_aisle: ingredient?.aisle ?? null,
        retailer_name: retailer?.name ?? null,
        retailer_slug: retailer?.slug ?? null,
        offer_id: offer ? String(offer.id) : null,
        offer_format: offer ? String(offer.format ?? '') : null,
        offer_quantity: offer ? Number(offer.quantite ?? 0) : null,
        offer_unit: offer ? String(offer.unite ?? '') : null,
        offer_active: offer ? offer.actif !== false : false,
      }
    })
  })

  return {
    data: query.retailerId
      ? matches.filter((match) => match.retailer_id === query.retailerId)
      : matches,
  }
})
