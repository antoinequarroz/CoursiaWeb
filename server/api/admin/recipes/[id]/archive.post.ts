import { officialRecipeParamsSchema } from '#shared/validation/course'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireRecipeWriteAccess(admin.role)

  const params = await getValidatedRouterParams(event, officialRecipeParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'recettes')
    .update({
      statut_publication: 'archivee',
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’archiver la recette mobile.')
  }

  const recipe = toAdminRecipeRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'archive',
    resourceType: 'course',
    resourceId: String(recipe.id),
    context: { slug: recipe.slug, table: 'recettes' },
  })

  return { data: recipe }
})
