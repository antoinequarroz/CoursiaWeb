import { recipeMediaParamsSchema, recipeMediaPublishSchema } from '#shared/validation/recipe-media'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeMediaAccess(admin.role)

  const params = await getValidatedRouterParams(event, recipeMediaParamsSchema.parse)
  const body = await readBody(event)
  const parsed = recipeMediaPublishSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  const supabase = createSupabaseServiceRoleClient()
  const asset = await getRecipeMediaAssetById(supabase, params.id)
  const publicPath = asset.public_path ?? asset.private_path.replace(/^/, 'published/')

  await publishRecipeMediaObject(supabase, asset.private_path, publicPath, asset.mime_type)

  const { data, error } = await supabase
    .from('recipe_media_assets')
    .update({
      status: 'published',
      alt_text: parsed.data.altText,
      public_path: publicPath,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de publier le média de recette.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'publish',
    resourceType: 'recipe_media_asset',
    resourceId: data.id,
    context: { publicPath, altTextPresent: true },
  })

  return { data }
})
