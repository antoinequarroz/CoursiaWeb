import { getUnpublishBehaviorMessage, officialRecipeParamsSchema, recipePublicationActionSchema } from '#shared/validation/course'
import { mobileTable } from '../../../../utils/mobile-admin-mapping'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipePublicationAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const body = await readBody(event)
  const parsed = recipePublicationActionSchema.safeParse(body ?? {})

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const existing = await getOfficialRecipeById(supabase, params.id)
  const blockingFields = getRecipePublicationBlockingFields(existing)

  if (blockingFields.length > 0) {
    throwApiError('INVALID_REQUEST', 'Publication refusÃ©e: des champs bloquants sont manquants.')
  }

  const { data, error } = await mobileTable(supabase, 'recettes')
    .update({ statut_publication: 'publiee', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de publier la recette officielle.')
  }

  const updatedRow = data as Record<string, unknown>

  await writeRecipePublicationHistory(supabase, {
    recipe: { ...existing, status: 'published' },
    fromStatus: existing.status,
    toStatus: 'published',
    userId: admin.userId,
    reason: parsed.data.reason,
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'publish',
    resourceType: 'course',
    resourceId: String(updatedRow.id),
    context: {
      slug: existing.slug,
      fromStatus: existing.status,
      toStatus: 'published',
      unpublishBehavior: getUnpublishBehaviorMessage(),
      table: 'recettes',
    },
  })

  const updated = await getOfficialRecipeById(supabase, params.id)

  return { data: updated, preview: buildRecipePreview(updated) }
})
