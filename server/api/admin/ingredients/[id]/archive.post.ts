import { canonicalIngredientParamsSchema } from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSensitiveIngredientAccess(admin.role)

  const params = await getValidatedRouterParams(event, canonicalIngredientParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await supabase
    .from('canonical_ingredients')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’archiver l’ingrédient canonique.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'archive',
    resourceType: 'canonical_ingredient',
    resourceId: data.id,
    context: { slug: data.slug },
  })

  return { data }
})

