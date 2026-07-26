import { officialRecipeParamsSchema, recipePublicationActionSchema } from '#shared/validation/course'

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

  const { data, error } = await supabase
    .from('official_recipes')
    .update({ status: 'review', updated_at: new Date().toISOString(), archived_at: null })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible dâ€™envoyer la recette en validation.')
  }

  await writeRecipePublicationHistory(supabase, {
    recipe: data,
    fromStatus: existing.status,
    toStatus: 'review',
    userId: admin.userId,
    reason: parsed.data.reason,
  })

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'official_recipe',
    resourceId: data.id,
    context: { slug: data.slug, fromStatus: existing.status, toStatus: data.status },
  })

  return { data, preview: buildRecipePreview(data) }
})
