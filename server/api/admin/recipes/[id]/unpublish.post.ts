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
  const { data, error } = await mobileTable(supabase, 'recettes')
    .update({ statut_publication: 'brouillon', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de dÃ©publier la recette officielle.')
  }

  await writeRecipePublicationHistory(supabase, {
    recipe: { ...existing, status: 'draft' },
    fromStatus: existing.status,
    toStatus: 'draft',
    userId: admin.userId,
    reason: parsed.data.reason,
  })

  const updatedRow = data as Record<string, unknown>

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'course',
    resourceId: String(updatedRow.id),
    context: { slug: existing.slug, fromStatus: existing.status, toStatus: 'draft', table: 'recettes' },
  })

  const updated = await getOfficialRecipeById(supabase, params.id)

  return {
    data: updated,
    preview: buildRecipePreview(updated),
    behavior: getUnpublishBehaviorMessage(),
  }
})
