import { officialRecipeParamsSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeDeleteAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const { data: recipe } = await mobileTable(supabase, 'recettes')
    .select('id, titre, cle_externe')
    .eq('id', params.id)
    .maybeSingle()
  const { error } = await mobileTable(supabase, 'recettes').delete().eq('id', params.id)

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de supprimer définitivement la recette mobile.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'archive',
    resourceType: 'course',
    resourceId: params.id,
    context: {
      permanentDelete: true,
      table: 'recettes',
      recipeId: String((recipe as Record<string, unknown> | null)?.id ?? params.id),
      recipeTitle: String((recipe as Record<string, unknown> | null)?.titre ?? ''),
    },
  })

  return { data: { id: params.id, deleted: true } }
})
