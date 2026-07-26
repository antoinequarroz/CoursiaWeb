import { retailCatalogQuerySchema } from '#shared/validation/retail-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRetailCatalogAccess(admin.role)

  const query = await getValidatedQuery(event, retailCatalogQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  let request = supabase.from('retailers').select('*').order('updated_at', { ascending: false }).limit(query.limit)

  if (query.search) {
    request = request.or(`name.ilike.%${query.search}%,slug.ilike.%${query.search}%`)
  }
  if (query.status) {
    request = request.eq('status', query.status)
  }

  const { data, error } = await request

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de lister les enseignes.')
  }

  return { data }
})
