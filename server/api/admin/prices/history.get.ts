import { retailCatalogQuerySchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, retailCatalogQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = supabase.from('price_history').select('*').order('collected_at', { ascending: false }).limit(query.limit)

  if (query.retailerId) {
    request = request.eq('retailer_id', query.retailerId)
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de consulter lâ€™historique des prix.')
  }

  return { data }
})
