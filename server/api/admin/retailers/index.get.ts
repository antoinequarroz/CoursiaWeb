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

  return { data: Array.isArray(data) ? data.map(toAdminRetailerRow) : [] }
})
