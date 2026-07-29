import { retailCatalogQuerySchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, retailCatalogQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = mobileTable(supabase, 'produits_canoniques')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(query.limit)

  if (query.search) {
    request = request.or(`nom.ilike.%${query.search}%,rayon.ilike.%${query.search}%`)
  }

  if (query.retailerId) {
    const { data: offers, error: offersError } = await mobileTable(supabase, 'offres_magasin')
      .select('produit_canonique_id')
      .eq('enseigne_id', query.retailerId)
      .limit(5000)

    if (offersError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de filtrer les produits par enseigne.')
    }

    const productIds = Array.from(new Set((Array.isArray(offers) ? offers as Array<Record<string, unknown>> : [])
      .map((offer) => String(offer.produit_canonique_id ?? ''))
      .filter(Boolean)))

    if (productIds.length === 0) {
      return { data: [] }
    }

    request = request.in('id', productIds)
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les produits mobile.')
  }

  const products = Array.isArray(data) ? data.map(toAdminProductRow) : []
  const productIds = products.map((product) => product.id)

  if (productIds.length === 0) {
    return { data: products }
  }

  const { data: offers, error: offersError } = await mobileTable(supabase, 'offres_magasin')
    .select('id, produit_canonique_id, enseigne_id, format, quantite, unite, actif')
    .in('produit_canonique_id', productIds)
    .limit(5000)

  if (offersError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les offres produits.')
  }

  const offerRows = Array.isArray(offers) ? offers as Array<Record<string, unknown>> : []
  const retailerIds = Array.from(new Set(offerRows.map((offer) => String(offer.enseigne_id ?? '')).filter(Boolean)))
  const offerIds = offerRows.map((offer) => String(offer.id))
  const retailerById = new Map<string, { id: string; name: string; slug: string }>()
  const latestPriceByOfferId = new Map<string, Record<string, unknown>>()

  if (retailerIds.length > 0) {
    const { data: retailers, error: retailersError } = await mobileTable(supabase, 'enseignes')
      .select('id, nom, code')
      .in('id', retailerIds)
      .limit(500)

    if (retailersError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les enseignes liées.')
    }

    for (const retailer of Array.isArray(retailers) ? retailers as Array<Record<string, unknown>> : []) {
      const id = String(retailer.id)
      retailerById.set(id, {
        id,
        name: String(retailer.nom ?? ''),
        slug: String(retailer.code ?? ''),
      })
    }
  }

  if (offerIds.length > 0) {
    const { data: prices, error: pricesError } = await mobileTable(supabase, 'prix_historique')
      .select('id, offre_id, prix, prix_unitaire, promotion, source, collecte_le')
      .in('offre_id', offerIds)
      .order('collecte_le', { ascending: false })
      .limit(5000)

    if (pricesError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les derniers prix.')
    }

    for (const price of Array.isArray(prices) ? prices as Array<Record<string, unknown>> : []) {
      const offerId = String(price.offre_id ?? '')
      if (!latestPriceByOfferId.has(offerId)) {
        latestPriceByOfferId.set(offerId, price)
      }
    }
  }

  const offersByProductId = new Map<string, Array<Record<string, unknown>>>()

  for (const offer of offerRows) {
    const productId = String(offer.produit_canonique_id ?? '')
    const current = offersByProductId.get(productId) ?? []
    current.push(offer)
    offersByProductId.set(productId, current)
  }

  return {
    data: products.map((product) => {
      const productOffers = offersByProductId.get(product.id) ?? []

      return {
        ...product,
        offer_count: productOffers.length,
        active_offer_count: productOffers.filter((offer) => offer.actif !== false).length,
        offers: productOffers.map((offer) => {
          const retailer = retailerById.get(String(offer.enseigne_id ?? ''))
          const latestPrice = latestPriceByOfferId.get(String(offer.id))

          return {
            id: String(offer.id),
            retailer_id: String(offer.enseigne_id ?? ''),
            retailer_name: retailer?.name ?? 'Enseigne inconnue',
            retailer_slug: retailer?.slug ?? '',
            format: String(offer.format ?? ''),
            quantity: Number(offer.quantite ?? 0),
            unit: String(offer.unite ?? ''),
            active: offer.actif !== false,
            latest_price_chf: latestPrice?.prix ?? null,
            latest_price_collected_at: latestPrice?.collecte_le ?? null,
          }
        }),
      }
    }),
  }
})
