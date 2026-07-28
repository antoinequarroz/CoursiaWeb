import { recipeMediaMetadataSchema, recipeMediaParamsSchema } from '#shared/validation/recipe-media'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeMediaAccess(admin.role)

  const params = await getValidatedRouterParams(event, recipeMediaParamsSchema.parse)
  const body = await readBody(event)
  const parsed = recipeMediaMetadataSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const previous = await getRecipeMediaAssetById(supabase, params.id)
  await supabase
    .from('recipe_media_assets')
    .update({ status: 'replaced', updated_at: new Date().toISOString() })
    .eq('id', previous.id)

  const { data, error } = await supabase
    .from('recipe_media_assets')
    .insert(toRecipeMediaAssetRow(parsed.data, admin.userId))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de remplacer le média de recette.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'update',
    resourceType: 'recipe_media_asset',
    resourceId: data.id,
    context: { replacedAssetId: previous.id, orphanHandled: true },
  })

  return { data }
})
