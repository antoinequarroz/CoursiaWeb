import { retailCatalogQuerySchema } from '#shared/validation/retail-catalog'

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
      .limit(100)

    if (offersError) {
      throwApiError('UPSTREAM_ERROR', 'Impossible de filtrer les prix par enseigne.')
    }

    const offerIds = Array.isArray(offers)
      ? offers.map((offer) => String((offer as Record<string, unknown>).id))
      : []

    if (offerIds.length === 0) {
      return { data: [] }
    }

    request = request.or(offerIds.map((id) => `offre_id.eq.${id}`).join(','))
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les prix mobile.')
  }

  return { data: Array.isArray(data) ? data.map(toAdminPriceRow) : [] }
})
