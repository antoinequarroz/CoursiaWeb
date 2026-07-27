import { canonicalIngredientParamsSchema } from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireSensitiveIngredientAccess(admin.role)

  const params = await getValidatedRouterParams(event, canonicalIngredientParamsSchema.parse)
  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'ingredients')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de charger l’ingrédient mobile.')
  }

  if (!data) {
    throwApiError('NOT_FOUND', 'Ingrédient mobile introuvable.')
  }

  const ingredient = toAdminIngredientRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'archive',
    resourceType: 'course',
    resourceId: String(ingredient.id),
    context: {
      slug: ingredient.slug,
      table: 'ingredients',
      skipped: true,
      reason: 'La table mobile ingredients ne possède pas encore de statut d’archivage.',
    },
  })

  return {
    data: ingredient,
    warning: 'Archivage non appliqué : la table mobile ingredients ne possède pas encore de colonne de statut.',
  }
})
