import { adminNotificationQuerySchema } from '#shared/validation/notifications'

export default defineEventHandler(async (event) => {
  await getSensitiveAdminContext(event)

  const query = await getValidatedQuery(event, adminNotificationQuerySchema.parse)
  const supabase = createSupabaseServiceRoleClient()

  let request = supabase
    .from('notifications')
    .select('id, titre, message, type, lue, created_at')
    .order('created_at', { ascending: false })
    .limit(query.limit)

  if (query.unreadOnly) {
    request = request.eq('lue', false)
  }

  const [{ data, error }, { count, error: countError }] = await Promise.all([
    request,
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('lue', false),
  ])

  if (error || countError) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger les notifications admin.')
  }

  return {
    data: data ?? [],
    unreadCount: count ?? 0,
  }
})
