import { contentEntrySchema } from '#shared/validation/content-settings'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireContentSettingsAccess(admin.role)

  const body = await readBody(event)
  const parsed = contentEntrySchema.safeParse(body)
  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const row = toContentEntryRow(parsed.data)
  const { data, error } = await supabase
    .from('content_entries')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de creer le contenu administrable.')
  }

  await createContentRevision(supabase, {
    entry: data,
    authorUserId: admin.userId,
    changeSummary: 'Creation du contenu administrable.',
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'content_entry',
    resourceId: data.id,
    context: { key: data.key, kind: data.kind, status: data.status },
  })

  return { data }
})
