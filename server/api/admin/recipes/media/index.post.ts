import { recipeMediaMetadataSchema } from '#shared/validation/recipe-media'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeMediaAccess(admin.role)

  const body = await readBody(event)
  const parsed = recipeMediaMetadataSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const row = toRecipeMediaAssetRow(parsed.data, admin.userId)
  const { data, error } = await supabase.from('recipe_media_assets').insert(row).select('*').single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’enregistrer les métadonnées du média.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'recipe_media_asset',
    resourceId: data.id,
    context: { recipeId: data.recipe_id, privatePath: data.private_path },
  })

  return { data }
})
