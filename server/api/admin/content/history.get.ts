import { z } from 'zod'

const querySchema = z.object({
  contentEntryId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireContentSettingsAccess(admin.role)

  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  let query = supabase
    .from('content_entry_revisions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(parsed.data.limit)

  if (parsed.data.contentEntryId) {
    query = query.eq('content_entry_id', parsed.data.contentEntryId)
  }

  const { data, error } = await query

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger l historique des contenus.')
  }

  return { data }
})
