import { canonicalIngredientSchema } from '#shared/validation/ingredient-catalog'

export default defineEventHandler(async (event) => {
  const admin = await getSensitiveAdminContext(event)
  requireIngredientWriteAccess(admin.role)

  const body = await readBody(event)
  const parsed = canonicalIngredientSchema.safeParse(body)

  if (!parsed.success) {
    throwValidationError(parsed.error)
  }

  if (parsed.data.sensitive) {
    requireSensitiveIngredientAccess(admin.role)
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data, error } = await mobileTable(supabase, 'ingredients')
    .insert(toMobileIngredientRow(parsed.data))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de créer l’ingrédient mobile.')
  }

  const ingredient = toAdminIngredientRow(data as never)

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'course',
    resourceId: String(ingredient.id),
    context: { slug: ingredient.slug, table: 'ingredients' },
  })

  return { data: ingredient }
})
