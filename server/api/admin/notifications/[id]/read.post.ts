import { adminNotificationParamsSchema } from '#shared/validation/notifications'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  const params = await getValidatedRouterParams(event, adminNotificationParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()

  const { data, error } = await supabase
    .from('notifications')
    .update({ lue: true })
    .eq('id', params.id)
    .select('id, titre, message, type, lue, created_at')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de marquer la notification comme lue.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'notification',
    resourceId: data.id,
    context: {
      type: data.type,
      read: true,
    },
  })

  return { data }
})

