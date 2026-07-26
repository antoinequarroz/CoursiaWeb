import { contentEntryParamsSchema, contentEntrySchema } from '#shared/validation/content-settings'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireContentSettingsAccess(admin.role)

  const params = contentEntryParamsSchema.safeParse(event.context.params)
  if (!params.success) {
    throwValidationError(params.error)
  }

  const body = await readBody(event)
  const parsed = contentEntrySchema.safeParse(body)
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('content_entries')
    .update(toContentEntryRow(parsed.data))
    .eq('id', params.data.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de modifier le contenu administrable.')
  }

  await createContentRevision(supabase, {
    entry: data,
    authorUserId: admin.userId,
    changeSummary: 'Modification du contenu administrable.',
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'content_entry',
    resourceId: data.id,
    context: { key: data.key, kind: data.kind, status: data.status },
  })

  return { data }
})
