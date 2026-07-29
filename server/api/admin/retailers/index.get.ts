import { retailCatalogQuerySchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, retailCatalogQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = mobileTable(supabase, 'enseignes')
    .select('*')
    .order('nom', { ascending: true })
    .limit(query.limit)

  if (query.search) {
    request = request.or(`nom.ilike.%${query.search}%,code.ilike.%${query.search}%`)
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les enseignes mobile.')
  }

  const retailers = Array.isArray(data) ? data.map(toAdminRetailerRow) : []
  const retailerIds = retailers.map((retailer) => retailer.id)

  if (retailerIds.length === 0) {
    return { data: retailers }
  }

  const { data: offers, error: offersError } = await mobileTable(supabase, 'offres_magasin')
    .select('id, enseigne_id, actif')
    .in('enseigne_id', retailerIds)
    .limit(5000)

  if (offersError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de calculer les offres par enseigne.')
  }

  const offerRows = Array.isArray(offers) ? offers as Array<Record<string, unknown>> : []
  const offerIds = offerRows.map((offer) => String(offer.id))
  const priceCountByOfferId = new Map<string, number>()

  if (offerIds.length > 0) {
    const { data: prices, error: pricesError } = await mobileTable(supabase, 'prix_historique')
      .select('offre_id')
      .in('offre_id', offerIds)
      .limit(5000)

    if (pricesError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de calculer les prix par enseigne.')
    }

    for (const price of Array.isArray(prices) ? prices as Array<Record<string, unknown>> : []) {
      const offerId = String(price.offre_id ?? '')
      priceCountByOfferId.set(offerId, (priceCountByOfferId.get(offerId) ?? 0) + 1)
    }
  }

  const statsByRetailerId = new Map<string, { offers: number; activeOffers: number; prices: number }>()

  for (const offer of offerRows) {
    const retailerId = String(offer.enseigne_id ?? '')
    const stats = statsByRetailerId.get(retailerId) ?? { offers: 0, activeOffers: 0, prices: 0 }
    stats.offers += 1
    if (offer.actif !== false) stats.activeOffers += 1
    stats.prices += priceCountByOfferId.get(String(offer.id)) ?? 0
    statsByRetailerId.set(retailerId, stats)
  }

  return {
    data: retailers.map((retailer) => ({
      ...retailer,
      offer_count: statsByRetailerId.get(retailer.id)?.offers ?? 0,
      active_offer_count: statsByRetailerId.get(retailer.id)?.activeOffers ?? 0,
      price_count: statsByRetailerId.get(retailer.id)?.prices ?? 0,
    })),
  }
})
