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
  const { data, error } = await supabase
    .from('canonical_ingredients')
    .insert(toCanonicalIngredientRow(parsed.data))
    .select('*')
    .single()

  if (error) {
    throwApiError('UPSTREAM_ERROR', 'Impossible de créer l’ingrédient canonique.')
  }

  await writeAdminAuditLog(supabase, {
    actorUserId: admin.userId,
    action: 'create',
    resourceType: 'canonical_ingredient',
    resourceId: data.id,
    context: { slug: data.slug, sensitive: data.sensitive },
  })

  return { data }
})

