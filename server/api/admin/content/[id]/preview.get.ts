import { contentEntryParamsSchema } from '#shared/validation/content-settings'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireContentSettingsAccess(admin.role)

  const params = contentEntryParamsSchema.safeParse(event.context.params)
  if (!params.success) {
    throwValidationError(params.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const entry = await getContentEntryById(supabase, params.data.id)

  return { data: previewContentEntry(entry) }
})
