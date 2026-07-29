import { retailCatalogQuerySchema } from '#shared/validation/retail-catalog'
import { mobileTable, toAdminPriceRow } from '../../../utils/mobile-admin-mapping'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, retailCatalogQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = mobileTable(supabase, 'prix_historique')
    .select('*')
    .order('collecte_le', { ascending: false })
    .limit(query.limit)

  if (query.retailerId) {
    const { data: offers, error: offersError } = await mobileTable(supabase, 'offres_magasin')
      .select('id')
      .eq('enseigne_id', query.retailerId)
      .limit(5000)

    if (offersError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les offres de l’enseigne.')
    }

    const offerIds = Array.isArray(offers)
      ? offers.map((offer) => String((offer as Record<string, unknown>).id))
      : []

    request = offerIds.length > 0
      ? request.or(offerIds.map((id) => `offre_id.eq.${id}`).join(','))
      : request.eq('offre_id', '00000000-0000-0000-0000-000000000000')
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de consulter l’historique des prix.')
  }

  const prices = Array.isArray(data)
    ? data.map((price) => toAdminPriceRow(price as Record<string, unknown>))
    : []
  const offerIds = Array.from(new Set(prices.map((price) => price.product_id).filter(Boolean)))

  if (offerIds.length === 0) {
    return { data: prices }
  }

  const { data: offers, error: offersError } = await mobileTable(supabase, 'offres_magasin')
    .select('id, produit_canonique_id, enseigne_id, format, quantite, unite, actif')
    .in('id', offerIds)
    .limit(5000)

  if (offersError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les offres de l’historique.')
  }

  const offerRows = Array.isArray(offers) ? offers as Array<Record<string, unknown>> : []
  const productIds = Array.from(new Set(offerRows.map((offer) => String(offer.produit_canonique_id ?? '')).filter(Boolean)))
  const retailerIds = Array.from(new Set(offerRows.map((offer) => String(offer.enseigne_id ?? '')).filter(Boolean)))
  const productById = new Map<string, { id: string; name: string }>()
  const retailerById = new Map<string, { id: string; name: string; slug: string }>()

  if (productIds.length > 0) {
    const { data: products, error: productsError } = await mobileTable(supabase, 'produits_canoniques')
      .select('id, nom')
      .in('id', productIds)
      .limit(5000)

    if (productsError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les produits de l’historique.')
    }

    for (const product of Array.isArray(products) ? products as Array<Record<string, unknown>> : []) {
      const id = String(product.id)
      productById.set(id, { id, name: String(product.nom ?? '') })
    }
  }

  if (retailerIds.length > 0) {
    const { data: retailers, error: retailersError } = await mobileTable(supabase, 'enseignes')
      .select('id, nom, code')
      .in('id', retailerIds)
      .limit(500)

    if (retailersError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de consulter les enseignes de l’historique.')
    }

    for (const retailer of Array.isArray(retailers) ? retailers as Array<Record<string, unknown>> : []) {
      const id = String(retailer.id)
      retailerById.set(id, { id, name: String(retailer.nom ?? ''), slug: String(retailer.code ?? '') })
    }
  }

  const offerById = new Map(offerRows.map((offer) => [String(offer.id), offer]))

  return {
    data: prices.map((price) => {
      const offer = offerById.get(price.product_id)
      const product = offer ? productById.get(String(offer.produit_canonique_id ?? '')) : undefined
      const retailer = offer ? retailerById.get(String(offer.enseigne_id ?? '')) : undefined

      return {
        ...price,
        retailer_id: retailer?.id ?? String(offer?.enseigne_id ?? ''),
        product_name: product?.name ?? 'Produit inconnu',
        retailer_name: retailer?.name ?? 'Enseigne inconnue',
        retailer_slug: retailer?.slug ?? '',
        offer: offer
          ? {
              id: String(offer.id),
              format: String(offer.format ?? ''),
              quantity: Number(offer.quantite ?? 0),
              unit: String(offer.unite ?? ''),
              active: offer.actif !== false,
            }
          : null,
      }
    }),
  }
})
