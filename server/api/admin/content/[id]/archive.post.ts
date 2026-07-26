import { contentEntryParamsSchema } from '#shared/validation/content-settings'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireContentSettingsAccess(admin.role)

  const params = contentEntryParamsSchema.safeParse(event.context.params)
  if (!params.success) {
    throwValidationError(params.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('content_entries')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.data.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d archiver le contenu.')
  }

  await createContentRevision(supabase, {
    entry: data,
    authorUserId: admin.userId,
    changeSummary: 'Archivage du contenu administrable.',
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'archive',
    resourceType: 'content_entry',
    resourceId: data.id,
    context: { key: data.key, kind: data.kind },
  })

  return { data }
})
