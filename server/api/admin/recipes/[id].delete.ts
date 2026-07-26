import { officialRecipeParamsSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeDeleteAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const recipe = await getOfficialRecipeById(supabase, params.id)
  const { error } = await supabase.from('official_recipes').delete().eq('id', params.id)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de supprimer définitivement la recette officielle.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'archive',
    resourceType: 'official_recipe',
    resourceId: recipe.id,
    context: { permanentDelete: true, slug: recipe.slug },
  })

  return { data: { id: params.id, deleted: true } }
})

