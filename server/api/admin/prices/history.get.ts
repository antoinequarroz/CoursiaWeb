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

  return {
    data: Array.isArray(data)
      ? data.map((price) => toAdminPriceRow(price as Record<string, unknown>))
      : [],
  }
})
