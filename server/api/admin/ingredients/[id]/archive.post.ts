import { canonicalIngredientParamsSchema } from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSensitiveIngredientAccess(admin.role)

  const params = await getValidatedRouterParams(event, canonicalIngredientParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const now = new Date().toISOString()
  const { data, error } = await mobileTable(supabase, 'ingredients')
    .update({ archived_at: now, updated_at: now })
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible d’archiver l’ingrédient mobile.')
  }

  const ingredient = toAdminIngredientRow(data as Record<string, unknown>)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'archive',
    resourceType: 'canonical_ingredient',
    resourceId: String(ingredient.id),
    context: {
      slug: ingredient.slug,
      table: 'ingredients',
      archivedAt: typeof ingredient.archived_at === 'string' ? ingredient.archived_at : null,
    },
  })

  return { data: ingredient }
})
