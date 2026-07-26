import { contentEntryQuerySchema } from '#shared/validation/content-settings'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireContentSettingsAccess(admin.role)

  const parsed = contentEntryQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  let query = supabase
    .from('content_entries')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(parsed.data.limit)

  if (parsed.data.kind) {
    query = query.eq('kind', parsed.data.kind)
  }
  if (parsed.data.status) {
    query = query.eq('status', parsed.data.status)
  }
  if (parsed.data.search) {
    query = query.or(`title.ilike.%${parsed.data.search}%,key.ilike.%${parsed.data.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger les contenus administrables.')
  }

  return { data }
})
