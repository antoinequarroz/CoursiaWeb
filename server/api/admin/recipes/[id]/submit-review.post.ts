import { officialRecipeParamsSchema, recipePublicationActionSchema } from '#shared/validation/course'
import { mobileTable } from '../../../../utils/mobile-admin-mapping'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

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
    throwApiError('INVALID_REQUEST', 'La recette contient encore des champs bloquants avant validation.')
  }

  const { data, error } = await mobileTable(supabase, 'recettes')
    .update({ statut_publication: 'en_attente', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible dâ€™envoyer la recette en validation.')
  }

  await writeRecipePublicationHistory(supabase, {
    recipe: { ...existing, status: 'review' },
    fromStatus: existing.status,
    toStatus: 'review',
    userId: admin.userId,
    reason: parsed.data.reason,
  })

  const updatedRow = data as Record<string, unknown>

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'course',
    resourceId: String(updatedRow.id),
    context: { slug: existing.slug, fromStatus: existing.status, toStatus: 'review', table: 'recettes' },
  })

  const updated = await getOfficialRecipeById(supabase, params.id)

  return { data: updated, preview: buildRecipePreview(updated) }
})
